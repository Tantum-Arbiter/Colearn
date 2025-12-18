package com.app.controller;

import com.app.model.UserProfile;
import com.app.repository.UserProfileRepository;
import com.app.security.JwtAuthenticationFilter;
import com.app.service.ApplicationMetricsService;
import com.app.service.GatewayServiceApplication;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;
import java.util.*;
import java.util.concurrent.CompletableFuture;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(classes = GatewayServiceApplication.class)
@AutoConfigureMockMvc(addFilters = false)
@ActiveProfiles("test")
class ProfileControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private UserProfileRepository userProfileRepository;

    @MockBean
    private ApplicationMetricsService metricsService;

    @Autowired
    private ObjectMapper objectMapper;

    private UserProfile testProfile;
    private String testUserId;

    @BeforeEach
    void setUp() {
        testUserId = "test-user-123";
        
        testProfile = new UserProfile(testUserId);
        testProfile.setNickname("Freya");
        testProfile.setAvatarType("girl");
        testProfile.setAvatarId("girl_1");
        testProfile.setNotifications(UserProfile.createDefaultNotifications());
        testProfile.setSchedule(UserProfile.createDefaultSchedule());
        testProfile.setCreatedAt(Instant.now());
        testProfile.updateTimestamp();

        reset(userProfileRepository, metricsService);
    }

    private void setAuthenticatedUser(String userId) {
        List<SimpleGrantedAuthority> authorities = Collections.singletonList(
            new SimpleGrantedAuthority("ROLE_USER")
        );
        UsernamePasswordAuthenticationToken authentication =
            new UsernamePasswordAuthenticationToken(userId, null, authorities);
        
        JwtAuthenticationFilter.UserAuthenticationDetails details =
            new JwtAuthenticationFilter.UserAuthenticationDetails();
        details.setUserId(userId);
        details.setProvider("google");
        authentication.setDetails(details);
        
        SecurityContextHolder.getContext().setAuthentication(authentication);
    }

    @Test
    @DisplayName("GET /api/profile - Should return user profile successfully")
    void testGetProfile_Success() throws Exception {
        setAuthenticatedUser(testUserId);
        
        when(userProfileRepository.findByUserId(testUserId))
            .thenReturn(CompletableFuture.completedFuture(Optional.of(testProfile)));

        mockMvc.perform(get("/api/profile")
                .contentType(MediaType.APPLICATION_JSON))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.userId").value(testUserId))
            .andExpect(jsonPath("$.nickname").value("Freya"))
            .andExpect(jsonPath("$.avatarType").value("girl"))
            .andExpect(jsonPath("$.avatarId").value("girl_1"))
            .andExpect(jsonPath("$.notifications").exists())
            .andExpect(jsonPath("$.schedule").exists());

        verify(userProfileRepository).findByUserId(testUserId);
    }

    @Test
    @DisplayName("GET /api/profile - Should return 404 when profile not found")
    void testGetProfile_NotFound() throws Exception {
        setAuthenticatedUser(testUserId);

        when(userProfileRepository.findByUserId(testUserId))
            .thenReturn(CompletableFuture.completedFuture(Optional.empty()));

        mockMvc.perform(get("/api/profile")
                .contentType(MediaType.APPLICATION_JSON))
            .andExpect(status().isNotFound())
            .andExpect(jsonPath("$.success").value(false))
            .andExpect(jsonPath("$.errorCode").value("GTW-411"))
            .andExpect(jsonPath("$.error").exists())
            .andExpect(jsonPath("$.message").exists());

        verify(userProfileRepository).findByUserId(testUserId);
    }

    @Test
    @DisplayName("GET /api/profile - Should return 401 when not authenticated")
    void testGetProfile_Unauthorized() throws Exception {
        SecurityContextHolder.clearContext();

        mockMvc.perform(get("/api/profile")
                .contentType(MediaType.APPLICATION_JSON))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.success").value(false))
            .andExpect(jsonPath("$.errorCode").value("GTW-007"));

        verify(userProfileRepository, never()).findByUserId(anyString());
    }

    @Test
    @DisplayName("POST /api/profile - Should create new profile successfully")
    void testCreateProfile_Success() throws Exception {
        setAuthenticatedUser(testUserId);
        
        when(userProfileRepository.findByUserId(testUserId))
            .thenReturn(CompletableFuture.completedFuture(Optional.empty()));
        when(userProfileRepository.save(any(UserProfile.class)))
            .thenReturn(CompletableFuture.completedFuture(testProfile));

        Map<String, Object> requestBody = new HashMap<>();
        requestBody.put("nickname", "Freya");
        requestBody.put("avatarType", "girl");
        requestBody.put("avatarId", "girl_1");

        mockMvc.perform(post("/api/profile")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(requestBody)))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.userId").value(testUserId))
            .andExpect(jsonPath("$.nickname").value("Freya"))
            .andExpect(jsonPath("$.avatarType").value("girl"));

        verify(userProfileRepository).findByUserId(testUserId);
        verify(userProfileRepository).save(any(UserProfile.class));
    }

    @Test
    @DisplayName("POST /api/profile - Should update existing profile successfully")
    void testUpdateProfile_Success() throws Exception {
        setAuthenticatedUser(testUserId);

        UserProfile existingProfile = new UserProfile(testUserId);
        existingProfile.setNickname("OldName");
        existingProfile.setAvatarType("boy");
        existingProfile.setAvatarId("boy_1");
        existingProfile.setNotifications(UserProfile.createDefaultNotifications());
        existingProfile.setSchedule(UserProfile.createDefaultSchedule());

        when(userProfileRepository.findByUserId(testUserId))
            .thenReturn(CompletableFuture.completedFuture(Optional.of(existingProfile)));
        when(userProfileRepository.update(any(UserProfile.class)))
            .thenReturn(CompletableFuture.completedFuture(testProfile));

        Map<String, Object> requestBody = new HashMap<>();
        requestBody.put("nickname", "Freya");
        requestBody.put("avatarType", "girl");
        requestBody.put("avatarId", "girl_1");

        mockMvc.perform(post("/api/profile")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(requestBody)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.userId").value(testUserId))
            .andExpect(jsonPath("$.nickname").value("Freya"));

        verify(userProfileRepository).findByUserId(testUserId);
        verify(userProfileRepository).update(any(UserProfile.class));
    }

    @Test
    @DisplayName("POST /api/profile - Should return 400 for invalid data (nickname too long)")
    void testCreateProfile_InvalidNickname() throws Exception {
        setAuthenticatedUser(testUserId);

        when(userProfileRepository.findByUserId(testUserId))
            .thenReturn(CompletableFuture.completedFuture(Optional.empty()));

        Map<String, Object> requestBody = new HashMap<>();
        requestBody.put("nickname", "ThisNicknameIsWayTooLongForValidation");
        requestBody.put("avatarType", "girl");
        requestBody.put("avatarId", "girl_1");

        mockMvc.perform(post("/api/profile")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(requestBody)))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.success").value(false))
            .andExpect(jsonPath("$.errorCode").value("GTW-113"))
            .andExpect(jsonPath("$.error").exists())
            .andExpect(jsonPath("$.message").exists());

        verify(userProfileRepository, never()).save(any(UserProfile.class));
    }

    @Test
    @DisplayName("POST /api/profile - Should return 400 for invalid avatarType")
    void testCreateProfile_InvalidAvatarType() throws Exception {
        setAuthenticatedUser(testUserId);

        when(userProfileRepository.findByUserId(testUserId))
            .thenReturn(CompletableFuture.completedFuture(Optional.empty()));

        Map<String, Object> requestBody = new HashMap<>();
        requestBody.put("nickname", "Freya");
        requestBody.put("avatarType", "invalid");
        requestBody.put("avatarId", "girl_1");

        mockMvc.perform(post("/api/profile")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(requestBody)))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.success").value(false))
            .andExpect(jsonPath("$.errorCode").value("GTW-114"))
            .andExpect(jsonPath("$.error").exists())
            .andExpect(jsonPath("$.message").exists());

        verify(userProfileRepository, never()).save(any(UserProfile.class));
    }

    @Test
    @DisplayName("POST /api/profile - Should return 400 for missing required fields")
    void testCreateProfile_MissingFields() throws Exception {
        setAuthenticatedUser(testUserId);

        when(userProfileRepository.findByUserId(testUserId))
            .thenReturn(CompletableFuture.completedFuture(Optional.empty()));

        Map<String, Object> requestBody = new HashMap<>();
        requestBody.put("nickname", "Freya");

        mockMvc.perform(post("/api/profile")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(requestBody)))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.success").value(false))
            .andExpect(jsonPath("$.errorCode").value("GTW-114"))
            .andExpect(jsonPath("$.error").exists())
            .andExpect(jsonPath("$.message").exists());

        verify(userProfileRepository, never()).save(any(UserProfile.class));
    }

    @Test
    @DisplayName("POST /api/profile - Should return 401 when not authenticated")
    void testCreateProfile_Unauthorized() throws Exception {
        SecurityContextHolder.clearContext();

        Map<String, Object> requestBody = new HashMap<>();
        requestBody.put("nickname", "Freya");
        requestBody.put("avatarType", "girl");
        requestBody.put("avatarId", "girl_1");

        mockMvc.perform(post("/api/profile")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(requestBody)))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.success").value(false))
            .andExpect(jsonPath("$.errorCode").value("GTW-007"));

        verify(userProfileRepository, never()).save(any(UserProfile.class));
    }

    @Test
    @DisplayName("POST /api/profile - Should update notifications settings")
    void testUpdateProfile_Notifications() throws Exception {
        setAuthenticatedUser(testUserId);

        when(userProfileRepository.findByUserId(testUserId))
            .thenReturn(CompletableFuture.completedFuture(Optional.of(testProfile)));
        when(userProfileRepository.update(any(UserProfile.class)))
            .thenReturn(CompletableFuture.completedFuture(testProfile));

        Map<String, Object> notifications = new HashMap<>();
        notifications.put("enabled", false);
        notifications.put("storyReminders", false);

        Map<String, Object> requestBody = new HashMap<>();
        requestBody.put("notifications", notifications);

        mockMvc.perform(post("/api/profile")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(requestBody)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.userId").value(testUserId));

        verify(userProfileRepository).update(any(UserProfile.class));
    }
}


