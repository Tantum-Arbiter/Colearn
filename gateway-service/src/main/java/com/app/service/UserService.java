package com.app.service;

import com.app.dto.UserDTOs;
import com.app.model.ChildProfile;
import com.app.model.User;
import com.app.model.UserPreferences;
import com.app.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;

@Service
public class UserService {

    private static final Logger logger = LoggerFactory.getLogger(UserService.class);

    private final UserRepository userRepository;
    private final ApplicationMetricsService metricsService;

    @Autowired
    public UserService(UserRepository userRepository, ApplicationMetricsService metricsService) {
        this.userRepository = userRepository;
        this.metricsService = metricsService;
    }

    public CompletableFuture<User> createUser(String provider, String providerId) {
        logger.info("Creating new user with provider: {}", provider);

        return CompletableFuture.supplyAsync(() -> {
            try {
                Optional<User> existingUser = userRepository.findByProviderAndProviderId(provider, providerId).join();
                if (existingUser.isPresent()) {
                    logger.warn("User already exists with provider: {} and providerId: {}", provider, providerId);
                    throw new IllegalArgumentException("User already exists with this provider");
                }

                User user = new User();
                user.setId(UUID.randomUUID().toString());
                user.setProvider(provider);
                user.setProviderId(providerId);
                user.setActive(true);
                user.setCreatedAt(Instant.now());
                user.setUpdatedAt(Instant.now());
                user.updateLastLogin();
                user.setPreferences(createDefaultPreferences());

                User savedUser = userRepository.save(user).join();
                metricsService.recordUserCreated(provider);

                logger.info("User created successfully: {}", savedUser.getId());
                return savedUser;

            } catch (Exception e) {
                logger.error("Error creating user with provider: {}", provider, e);
                metricsService.recordUserCreationError(provider, e.getClass().getSimpleName());
                throw new RuntimeException("Failed to create user", e);
            }
        });
    }
    public CompletableFuture<Optional<User>> getUserById(String userId) {
        logger.debug("Getting user by ID: {}", userId);
        
        return userRepository.findById(userId)
                .thenApply(userOpt -> {
                    if (userOpt.isPresent()) {
                        metricsService.recordUserLookup("id", "found");
                    } else {
                        metricsService.recordUserLookup("id", "not_found");
                    }
                    return userOpt;
                });
    }
    public CompletableFuture<User> getOrCreateUser(String provider, String providerId) {
        logger.debug("Getting or creating user with provider: {}", provider);

        return userRepository.findByProviderAndProviderId(provider, providerId)
                .thenCompose(userOpt -> {
                    if (userOpt.isPresent()) {
                        User existingUser = userOpt.get();
                        existingUser.updateLastLogin();

                        return userRepository.save(existingUser)
                                .thenApply(savedUser -> {
                                    metricsService.recordUserLogin(provider, "existing");
                                    return savedUser;
                                });
                    } else {
                        return createUser(provider, providerId)
                                .thenApply(newUser -> {
                                    metricsService.recordUserLogin(provider, "new");
                                    return newUser;
                                });
                    }
                });
    }
    public CompletableFuture<User> updateUserPreferences(String userId, UserDTOs.UpdateUserPreferencesRequest request) {
        logger.debug("Updating preferences for user: {}", userId);
        
        return getUserById(userId)
                .thenCompose(userOpt -> {
                    if (userOpt.isEmpty()) {
                        throw new IllegalArgumentException("User not found: " + userId);
                    }
                    
                    User user = userOpt.get();
                    UserPreferences preferences = user.getPreferences();
                    if (preferences == null) {
                        preferences = createDefaultPreferences();
                    }
                    updatePreferencesFromRequest(preferences, request);
                    user.setPreferences(preferences);
                    user.setUpdatedAt(Instant.now());
                    
                    return userRepository.save(user)
                            .thenApply(savedUser -> {
                                metricsService.recordUserPreferencesUpdate(userId);
                                logger.debug("Preferences updated for user: {}", userId);
                                return savedUser;
                            });
                });
    }
    public CompletableFuture<User> addChildProfile(String userId, UserDTOs.CreateChildProfileRequest request) {
        logger.debug("Adding child profile for user: {}", userId);
        
        return getUserById(userId)
                .thenCompose(userOpt -> {
                    if (userOpt.isEmpty()) {
                        throw new IllegalArgumentException("User not found: " + userId);
                    }
                    
                    User user = userOpt.get();
                    ChildProfile child = new ChildProfile();
                    child.setId(UUID.randomUUID().toString());
                    child.setName(request.getName());
                    child.setAvatar(request.getAvatar());
                    child.setAgeRange(request.getAgeRange());
                    child.setActive(true);
                    child.setCreatedAt(Instant.now());
                    user.addChild(child);
                    user.setUpdatedAt(Instant.now());
                    
                    return userRepository.save(user)
                            .thenApply(savedUser -> {
                                logger.info("Child profile added for user: {} - child: {}", userId, child.getId());
                                return savedUser;
                            });
                });
    }
    public CompletableFuture<User> updateChildProfile(String userId, String childId,
                                                    UserDTOs.UpdateChildProfileRequest request) {
        logger.debug("Updating child profile {} for user: {}", childId, userId);
        
        return getUserById(userId)
                .thenCompose(userOpt -> {
                    if (userOpt.isEmpty()) {
                        throw new IllegalArgumentException("User not found: " + userId);
                    }
                    
                    User user = userOpt.get();
                    ChildProfile child = user.getChildById(childId);
                    if (child == null) {
                        throw new IllegalArgumentException("Child not found: " + childId);
                    }
                    if (request.getName() != null) {
                        child.setName(request.getName());
                    }
                    if (request.getAvatar() != null) {
                        child.setAvatar(request.getAvatar());
                    }
                    if (request.getAgeRange() != null) {
                        child.setAgeRange(request.getAgeRange());
                    }

                    user.setUpdatedAt(Instant.now());
                    
                    return userRepository.save(user)
                            .thenApply(savedUser -> {
                                logger.debug("Child profile updated: {} for user: {}", childId, userId);
                                return savedUser;
                            });
                });
    }
    public CompletableFuture<User> removeChildProfile(String userId, String childId) {
        logger.debug("Removing child profile {} for user: {}", childId, userId);
        
        return getUserById(userId)
                .thenCompose(userOpt -> {
                    if (userOpt.isEmpty()) {
                        throw new IllegalArgumentException("User not found: " + userId);
                    }
                    
                    User user = userOpt.get();
                    boolean removed = user.removeChild(childId);
                    if (!removed) {
                        throw new IllegalArgumentException("Child not found: " + childId);
                    }
                    
                    user.setUpdatedAt(Instant.now());
                    
                    return userRepository.save(user)
                            .thenApply(savedUser -> {
                                logger.info("Child profile removed: {} for user: {}", childId, userId);
                                return savedUser;
                            });
                });
    }
    public CompletableFuture<User> deactivateUser(String userId) {
        logger.info("Deactivating user: {}", userId);
        
        return userRepository.deactivateUser(userId)
                .thenApply(user -> {
                    metricsService.recordUserDeactivated(userId);
                    return user;
                });
    }
    public CompletableFuture<List<User>> getAllActiveUsers() {
        logger.debug("Getting all active users");
        
        return userRepository.findAllActive()
                .thenApply(users -> {
                    metricsService.recordUserListQuery("active", users.size());
                    return users;
                });
    }
    public CompletableFuture<Long> countActiveUsers() {
        logger.debug("Counting active users");
        
        return userRepository.countActiveUsers();
    }

    private UserPreferences createDefaultPreferences() {
        UserPreferences preferences = new UserPreferences();
        preferences.setLanguage("en");
        preferences.setTimezone("UTC");
        preferences.setTheme("light");

        UserPreferences.NotificationPreferences notifications = new UserPreferences.NotificationPreferences();
        notifications.setPushEnabled(true);
        notifications.setEmailEnabled(true);
        notifications.setReminderEnabled(true);
        preferences.setNotifications(notifications);

        UserPreferences.ScreenTimePreferences screenTime = new UserPreferences.ScreenTimePreferences();
        screenTime.setDailyLimitMinutes(120); // 2 hours
        screenTime.setWarningMinutes(15);
        screenTime.setBedtimeEnabled(false);
        preferences.setScreenTime(screenTime);

        UserPreferences.AudioPreferences audio = new UserPreferences.AudioPreferences();
        audio.setMusicVolume(0.6);
        audio.setEffectsVolume(0.8);
        audio.setVoiceVolume(1.0);
        audio.setBackgroundMusicEnabled(true);
        audio.setSoundEffectsEnabled(true);
        preferences.setAudio(audio);

        UserPreferences.PrivacyPreferences privacy = new UserPreferences.PrivacyPreferences();
        privacy.setDataCollectionEnabled(true);
        privacy.setAnalyticsEnabled(true);
        privacy.setCrashReportingEnabled(true);
        privacy.setPersonalizedContentEnabled(true);
        preferences.setPrivacy(privacy);
        
        return preferences;
    }

    private void updatePreferencesFromRequest(UserPreferences preferences, UserDTOs.UpdateUserPreferencesRequest request) {
        if (request.getLanguage() != null) {
            preferences.setLanguage(request.getLanguage());
        }
        if (request.getTimezone() != null) {
            preferences.setTimezone(request.getTimezone());
        }
        if (request.getTheme() != null) {
            preferences.setTheme(request.getTheme());
        }
        // TODO: implement nested preferences merging
    }
}
