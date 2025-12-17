package com.app.controller;

import com.app.exception.ErrorCode;
import com.app.exception.GatewayException;
import com.app.exception.ValidationException;
import com.app.model.UserProfile;
import com.app.repository.UserProfileRepository;
import com.app.security.JwtAuthenticationFilter;
import com.app.service.ApplicationMetricsService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.Optional;

/**
 * Profile Controller
 * Handles user profile operations (non-PII preferences and settings)
 */
@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*", maxAge = 3600)
public class ProfileController {

    private static final Logger logger = LoggerFactory.getLogger(ProfileController.class);

    private final UserProfileRepository userProfileRepository;
    private final ApplicationMetricsService metricsService;

    @Autowired
    public ProfileController(UserProfileRepository userProfileRepository, 
                           ApplicationMetricsService metricsService) {
        this.userProfileRepository = userProfileRepository;
        this.metricsService = metricsService;
    }

    /**
     * Get user profile
     * GET /api/profile
     */
    @GetMapping("/profile")
    public ResponseEntity<?> getProfile() {
        long startTime = System.currentTimeMillis();
        String userId = getAuthenticatedUserId();
        if (userId == null) {
            throw new GatewayException(ErrorCode.UNAUTHORIZED_ACCESS, "Authentication required");
        }

        logger.debug("Getting profile for user: {}", userId);

        try {
            Optional<UserProfile> profileOpt = userProfileRepository.findByUserId(userId).join();

            if (profileOpt.isEmpty()) {
                // Record profile not found
                long processingTime = System.currentTimeMillis() - startTime;
                metricsService.recordProfileRetrieved(userId, false, processingTime);

                throw new GatewayException(ErrorCode.PROFILE_NOT_FOUND, "User profile not found");
            }

            // Record successful profile retrieval
            long processingTime = System.currentTimeMillis() - startTime;
            metricsService.recordProfileRetrieved(userId, true, processingTime);

            return ResponseEntity.ok(profileOpt.get());

        } catch (GatewayException e) {
            throw e;
        } catch (Exception e) {
            // Record failed profile retrieval
            long processingTime = System.currentTimeMillis() - startTime;
            metricsService.recordProfileRetrieved(userId, false, processingTime);

            logger.error("Error getting profile for user: {}", userId, e);
            throw new GatewayException(ErrorCode.DATABASE_ERROR, "Failed to retrieve profile", e);
        }
    }

    /**
     * Delete user profile
     * DELETE /api/profile
     */
    @DeleteMapping("/profile")
    public ResponseEntity<?> deleteProfile() {
        String userId = getAuthenticatedUserId();
        if (userId == null) {
            throw new GatewayException(ErrorCode.UNAUTHORIZED_ACCESS, "Authentication required");
        }

        logger.debug("Deleting profile for user: {}", userId);

        try {
            Optional<UserProfile> existingProfileOpt = userProfileRepository.findByUserId(userId).join();

            if (existingProfileOpt.isEmpty()) {
                throw new GatewayException(ErrorCode.PROFILE_NOT_FOUND, "User profile not found");
            }

            userProfileRepository.delete(userId).join();

            logger.info("Successfully deleted profile for user: {}", userId);
            return ResponseEntity.noContent().build();

        } catch (GatewayException e) {
            throw e;
        } catch (Exception e) {
            metricsService.recordProfileOperationFailure("delete", e.getClass().getSimpleName());

            logger.error("Error deleting profile for user: {}", userId, e);
            throw new GatewayException(ErrorCode.DATABASE_ERROR, "Failed to delete profile", e);
        }
    }

    /**
     * Create or update user profile
     * POST /api/profile
     */
    @PostMapping("/profile")
    public ResponseEntity<?> saveProfile(@RequestBody Map<String, Object> requestBody) {
        long startTime = System.currentTimeMillis();
        String userId = getAuthenticatedUserId();
        if (userId == null) {
            throw new GatewayException(ErrorCode.UNAUTHORIZED_ACCESS, "Authentication required");
        }

        logger.debug("Saving profile for user: {}", userId);

        try {
            Optional<UserProfile> existingProfileOpt = userProfileRepository.findByUserId(userId).join();

            UserProfile profile;
            boolean isUpdate = existingProfileOpt.isPresent();

            if (isUpdate) {
                profile = existingProfileOpt.get();
                updateProfileFromRequest(profile, requestBody);
                validateProfile(profile);
                profile = userProfileRepository.update(profile).join();

                // Record successful profile update
                long processingTime = System.currentTimeMillis() - startTime;
                metricsService.recordProfileUpdated(userId, true, processingTime);

                return ResponseEntity.ok(profile);
            } else {
                profile = createProfileFromRequest(userId, requestBody);
                validateProfile(profile);
                profile = userProfileRepository.save(profile).join();

                // Record successful profile creation
                long processingTime = System.currentTimeMillis() - startTime;
                metricsService.recordProfileCreated(userId, true, processingTime);

                return ResponseEntity.status(HttpStatus.CREATED).body(profile);
            }

        } catch (GatewayException e) {
            // Record failed operation
            long processingTime = System.currentTimeMillis() - startTime;
            Optional<UserProfile> existingProfileOpt = userProfileRepository.findByUserId(userId).join();
            if (existingProfileOpt.isPresent()) {
                metricsService.recordProfileUpdated(userId, false, processingTime);
            } else {
                metricsService.recordProfileCreated(userId, false, processingTime);
            }

            throw e;
        } catch (Exception e) {
            // Record failed operation
            long processingTime = System.currentTimeMillis() - startTime;
            try {
                Optional<UserProfile> existingProfileOpt = userProfileRepository.findByUserId(userId).join();
                if (existingProfileOpt.isPresent()) {
                    metricsService.recordProfileUpdated(userId, false, processingTime);
                } else {
                    metricsService.recordProfileCreated(userId, false, processingTime);
                }
            } catch (Exception metricsEx) {
                logger.warn("Failed to record metrics for failed profile save", metricsEx);
            }

            logger.error("Error saving profile for user: {}", userId, e);
            throw new GatewayException(ErrorCode.PROFILE_UPDATE_FAILED, "Failed to save profile", e);
        }
    }

    private String getAuthenticatedUserId() {
        logger.debug("Getting authenticated user ID - Thread: {}", Thread.currentThread().getName());

        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        logger.debug("Authentication object: {}", authentication);

        if (authentication == null || !authentication.isAuthenticated()) {
            logger.warn("No authentication or not authenticated - auth: {}", authentication);
            return null;
        }

        logger.debug("Authentication principal: {}, details: {}",
            authentication.getPrincipal(), authentication.getDetails());

        Object details = authentication.getDetails();
        if (details instanceof JwtAuthenticationFilter.UserAuthenticationDetails) {
            String userId = ((JwtAuthenticationFilter.UserAuthenticationDetails) details).getUserId();
            logger.debug("Extracted userId from details: {}", userId);
            return userId;
        }

        Object principal = authentication.getPrincipal();
        if (principal instanceof String) {
            logger.debug("Using principal as userId: {}", principal);
            return (String) principal;
        }

        logger.warn("Could not extract userId - principal type: {}, details type: {}",
            principal != null ? principal.getClass().getName() : "null",
            details != null ? details.getClass().getName() : "null");
        return null;
    }

    private UserProfile createProfileFromRequest(String userId, Map<String, Object> requestBody) {
        // Validate required fields first
        if (!requestBody.containsKey("nickname") || requestBody.get("nickname") == null) {
            throw new ValidationException(ErrorCode.INVALID_NICKNAME, "Nickname is required");
        }

        if (!requestBody.containsKey("avatarType") || requestBody.get("avatarType") == null) {
            throw new ValidationException(ErrorCode.INVALID_AVATAR_TYPE, "Avatar type is required");
        }

        UserProfile profile = new UserProfile(userId);

        profile.setNickname((String) requestBody.get("nickname"));
        profile.setAvatarType((String) requestBody.get("avatarType"));

        if (requestBody.containsKey("avatarId")) {
            profile.setAvatarId((String) requestBody.get("avatarId"));
        }

        if (requestBody.containsKey("notifications")) {
            @SuppressWarnings("unchecked")
            Map<String, Object> notifications = (Map<String, Object>) requestBody.get("notifications");
            profile.setNotifications(notifications);
        } else {
            profile.setNotifications(UserProfile.createDefaultNotifications());
        }

        if (requestBody.containsKey("schedule")) {
            @SuppressWarnings("unchecked")
            Map<String, Object> schedule = (Map<String, Object>) requestBody.get("schedule");
            profile.setSchedule(schedule);
        } else {
            profile.setSchedule(UserProfile.createDefaultSchedule());
        }

        return profile;
    }

    private void updateProfileFromRequest(UserProfile profile, Map<String, Object> requestBody) {
        if (requestBody.containsKey("nickname")) {
            profile.setNickname((String) requestBody.get("nickname"));
        }

        if (requestBody.containsKey("avatarType")) {
            profile.setAvatarType((String) requestBody.get("avatarType"));
        }

        if (requestBody.containsKey("avatarId")) {
            profile.setAvatarId((String) requestBody.get("avatarId"));
        }

        if (requestBody.containsKey("notifications")) {
            @SuppressWarnings("unchecked")
            Map<String, Object> notifications = (Map<String, Object>) requestBody.get("notifications");

            Map<String, Object> currentNotifications = profile.getNotifications();
            if (currentNotifications == null) {
                currentNotifications = UserProfile.createDefaultNotifications();
            }

            currentNotifications.putAll(notifications);
            profile.setNotifications(currentNotifications);
        }

        if (requestBody.containsKey("schedule")) {
            @SuppressWarnings("unchecked")
            Map<String, Object> schedule = (Map<String, Object>) requestBody.get("schedule");

            Map<String, Object> currentSchedule = profile.getSchedule();
            if (currentSchedule == null) {
                currentSchedule = UserProfile.createDefaultSchedule();
            }

            currentSchedule.putAll(schedule);
            profile.setSchedule(currentSchedule);
        }
    }

    private void validateProfile(UserProfile profile) {
        if (profile == null) {
            throw new ValidationException(ErrorCode.INVALID_PROFILE_DATA, "Profile cannot be null");
        }

        if (profile.getNickname() == null || profile.getNickname().trim().isEmpty()) {
            throw new ValidationException(ErrorCode.INVALID_NICKNAME, "Nickname is required");
        }

        if (profile.getNickname().length() > 20) {
            throw new ValidationException(ErrorCode.INVALID_NICKNAME, "Nickname must be 1-20 characters");
        }

        if (profile.getAvatarType() == null ||
            (!profile.getAvatarType().equals("boy") && !profile.getAvatarType().equals("girl"))) {
            throw new ValidationException(ErrorCode.INVALID_AVATAR_TYPE, "Avatar type must be 'boy' or 'girl'");
        }

        // avatarId is optional, but if provided it must not be empty
        if (profile.getAvatarId() != null && profile.getAvatarId().trim().isEmpty()) {
            throw new ValidationException(ErrorCode.INVALID_AVATAR_ID, "Avatar ID cannot be empty");
        }

        if (profile.getNotifications() == null) {
            throw new ValidationException(ErrorCode.INVALID_PROFILE_DATA, "Notifications configuration is required");
        }

        if (profile.getSchedule() == null) {
            throw new ValidationException(ErrorCode.INVALID_PROFILE_DATA, "Schedule configuration is required");
        }
    }
}


