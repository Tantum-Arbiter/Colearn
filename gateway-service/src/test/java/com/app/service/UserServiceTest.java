package com.app.service;

import com.app.model.ChildProfile;
import com.app.model.User;
import com.app.model.UserPreferences;
import com.app.dto.UserDTOs;
import com.app.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutionException;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Unit tests for UserService
 */
@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private ApplicationMetricsService metricsService;

    private UserService userService;
    private User testUser;

    @BeforeEach
    void setUp() {
        userService = new UserService(userRepository, metricsService);

        // Create test user (PII-free)
        testUser = new User();
        testUser.setId("test-user-id");
        testUser.setProvider("google");
        testUser.setProviderId("google-123");
        testUser.setCreatedAt(Instant.now());
        testUser.setUpdatedAt(Instant.now());
        testUser.setActive(true);
        testUser.setLastLoginAt(Instant.now());

        // Setup preferences
        UserPreferences preferences = new UserPreferences();
        preferences.getNotifications().setPushEnabled(true);
        preferences.getScreenTime().setDailyLimitMinutes(60);
        testUser.setPreferences(preferences);

        // Setup children
        List<ChildProfile> children = new ArrayList<>();
        ChildProfile child = new ChildProfile();
        child.setId("child-1");
        child.setName("Test Child");
        child.setCreatedAt(Instant.now());
        children.add(child);
        testUser.setChildren(children);
    }

    @Test
    void createUser_Success() throws Exception {
        // Arrange (PII-free - no email lookup needed)
        when(userRepository.findByProviderAndProviderId(testUser.getProvider(), testUser.getProviderId()))
                .thenReturn(CompletableFuture.completedFuture(Optional.empty()));
        when(userRepository.save(any(User.class))).thenReturn(CompletableFuture.completedFuture(testUser));

        // Act
        CompletableFuture<User> result = userService.createUser(
                testUser.getProvider(),
                testUser.getProviderId()
        );
        User createdUser = result.get();

        // Assert
        assertNotNull(createdUser);
        assertEquals(testUser.getProvider(), createdUser.getProvider());
        assertEquals(testUser.getProviderId(), createdUser.getProviderId());
        assertTrue(createdUser.isActive());
        assertNotNull(createdUser.getCreatedAt());
        assertNotNull(createdUser.getUpdatedAt());

        // Verify repository interaction
        verify(userRepository).save(any(User.class));

        // Verify metrics
        verify(metricsService).recordUserCreated(testUser.getProvider());
    }

    @Test
    void createUser_Failure() throws Exception {
        // Arrange
        when(userRepository.findByProviderAndProviderId(testUser.getProvider(), testUser.getProviderId()))
                .thenReturn(CompletableFuture.completedFuture(Optional.empty()));
        when(userRepository.save(any(User.class)))
                .thenReturn(CompletableFuture.failedFuture(new RuntimeException("Database error")));

        // Act & Assert
        CompletableFuture<User> result = userService.createUser(
                testUser.getProvider(),
                testUser.getProviderId()
        );

        ExecutionException exception = assertThrows(ExecutionException.class, () -> result.get());
        assertTrue(exception.getCause() instanceof RuntimeException);
        assertEquals("Failed to create user", exception.getCause().getMessage());

        // Verify error metrics
        verify(metricsService).recordUserCreationError(testUser.getProvider(), "CompletionException");
    }

    @Test
    void getUserById_Success() throws Exception {
        // Arrange
        when(userRepository.findById(testUser.getId()))
                .thenReturn(CompletableFuture.completedFuture(Optional.of(testUser)));

        // Act
        CompletableFuture<Optional<User>> result = userService.getUserById(testUser.getId());
        Optional<User> foundUser = result.get();

        // Assert
        assertTrue(foundUser.isPresent());
        assertEquals(testUser.getId(), foundUser.get().getId());
        assertEquals(testUser.getProvider(), foundUser.get().getProvider());

        // Verify repository interaction
        verify(userRepository).findById(testUser.getId());

        // Verify metrics
        verify(metricsService).recordUserLookup("id", "found");
    }

    @Test
    void getUserById_NotFound() throws Exception {
        // Arrange
        when(userRepository.findById(testUser.getId()))
                .thenReturn(CompletableFuture.completedFuture(Optional.empty()));

        // Act
        CompletableFuture<Optional<User>> result = userService.getUserById(testUser.getId());
        Optional<User> foundUser = result.get();

        // Assert
        assertFalse(foundUser.isPresent());

        // Verify metrics
        verify(metricsService).recordUserLookup("id", "not_found");
    }

    @Test
    void getOrCreateUser_ExistingUser() throws Exception {
        // Arrange
        when(userRepository.findByProviderAndProviderId(testUser.getProvider(), testUser.getProviderId()))
                .thenReturn(CompletableFuture.completedFuture(Optional.of(testUser)));
        when(userRepository.save(any(User.class)))
                .thenReturn(CompletableFuture.completedFuture(testUser));

        // Act (PII-free - only provider and providerId)
        CompletableFuture<User> result = userService.getOrCreateUser(
                testUser.getProvider(),
                testUser.getProviderId()
        );
        User user = result.get();

        // Assert
        assertNotNull(user);
        assertEquals(testUser.getId(), user.getId());
        assertEquals(testUser.getProvider(), user.getProvider());

        // Verify repository interactions
        verify(userRepository).findByProviderAndProviderId(testUser.getProvider(), testUser.getProviderId());
        verify(userRepository).save(any(User.class));
        verify(userRepository, never()).updateLastLogin(anyString());

        // Verify metrics
        verify(metricsService).recordUserLogin(testUser.getProvider(), "existing");
    }

    @Test
    void getOrCreateUser_NewUser() throws Exception {
        // Arrange (PII-free - no email lookup needed)
        // Note: findByProviderAndProviderId is called twice - once in getOrCreateUser and once in createUser
        when(userRepository.findByProviderAndProviderId(testUser.getProvider(), testUser.getProviderId()))
                .thenReturn(CompletableFuture.completedFuture(Optional.empty()));
        when(userRepository.save(any(User.class)))
                .thenReturn(CompletableFuture.completedFuture(testUser));

        // Act (PII-free - only provider and providerId)
        CompletableFuture<User> result = userService.getOrCreateUser(
                testUser.getProvider(),
                testUser.getProviderId()
        );
        User user = result.get();

        // Assert
        assertNotNull(user);
        assertEquals(testUser.getProvider(), user.getProvider());
        assertEquals(testUser.getProviderId(), user.getProviderId());

        // Verify repository interactions (findByProviderAndProviderId called twice: once in getOrCreateUser, once in createUser)
        verify(userRepository, times(2)).findByProviderAndProviderId(testUser.getProvider(), testUser.getProviderId());
        verify(userRepository).save(any(User.class));
        verify(userRepository, never()).updateLastLogin(anyString());

        // Verify metrics
        verify(metricsService).recordUserCreated(testUser.getProvider());
        verify(metricsService).recordUserLogin(testUser.getProvider(), "new");
    }

    @Test
    void updateUserPreferences_Success() throws Exception {
        // Arrange
        UserDTOs.UpdateUserPreferencesRequest request = new UserDTOs.UpdateUserPreferencesRequest();
        request.setLanguage("es");
        request.setTheme("dark");

        when(userRepository.findById(testUser.getId()))
                .thenReturn(CompletableFuture.completedFuture(Optional.of(testUser)));
        when(userRepository.save(any(User.class)))
                .thenReturn(CompletableFuture.completedFuture(testUser));

        // Act
        CompletableFuture<User> result = userService.updateUserPreferences(testUser.getId(), request);
        User updatedUser = result.get();

        // Assert
        assertNotNull(updatedUser);
        verify(userRepository).save(any(User.class));
        verify(metricsService).recordUserPreferencesUpdate(testUser.getId());
    }

    @Test
    void addChildProfile_Success() throws Exception {
        // Arrange
        UserDTOs.CreateChildProfileRequest request = new UserDTOs.CreateChildProfileRequest();
        request.setName("New Child");
        request.setAgeRange("2-3");
        request.setAvatar("avatar1");

        when(userRepository.findById(testUser.getId()))
                .thenReturn(CompletableFuture.completedFuture(Optional.of(testUser)));
        when(userRepository.save(any(User.class)))
                .thenReturn(CompletableFuture.completedFuture(testUser));

        // Act
        CompletableFuture<User> result = userService.addChildProfile(testUser.getId(), request);
        User updatedUser = result.get();

        // Assert
        assertNotNull(updatedUser);
        verify(userRepository).save(any(User.class));
    }

    @Test
    void removeChildProfile_Success() throws Exception {
        // Arrange
        String childId = "child-1";
        when(userRepository.findById(testUser.getId()))
                .thenReturn(CompletableFuture.completedFuture(Optional.of(testUser)));
        when(userRepository.save(any(User.class)))
                .thenReturn(CompletableFuture.completedFuture(testUser));

        // Act
        CompletableFuture<User> result = userService.removeChildProfile(testUser.getId(), childId);
        User updatedUser = result.get();

        // Assert
        assertNotNull(updatedUser);
        verify(userRepository).save(any(User.class));
    }

    @Test
    void removeChildProfile_NotFound() {
        // Arrange
        String childId = "non-existent-child";
        when(userRepository.findById(testUser.getId()))
                .thenReturn(CompletableFuture.completedFuture(Optional.of(testUser)));

        // Act & Assert
        ExecutionException exception = assertThrows(ExecutionException.class, () -> {
            CompletableFuture<User> result = userService.removeChildProfile(testUser.getId(), childId);
            result.get(); // This should throw an exception
        });
        assertTrue(exception.getCause() instanceof IllegalArgumentException);
        assertEquals("Child not found: non-existent-child", exception.getCause().getMessage());
    }

    @Test
    void deactivateUser_Success() throws Exception {
        // Arrange
        when(userRepository.deactivateUser(testUser.getId()))
                .thenReturn(CompletableFuture.completedFuture(testUser));

        // Act
        CompletableFuture<User> result = userService.deactivateUser(testUser.getId());
        User deactivatedUser = result.get();

        // Assert
        assertNotNull(deactivatedUser);
        verify(userRepository).deactivateUser(testUser.getId());
        verify(metricsService).recordUserDeactivated(testUser.getId());
    }

    @Test
    void getAllActiveUsers_Success() throws Exception {
        // Arrange
        List<User> users = List.of(testUser);
        when(userRepository.findAllActive())
                .thenReturn(CompletableFuture.completedFuture(users));

        // Act
        CompletableFuture<List<User>> result = userService.getAllActiveUsers();
        List<User> activeUsers = result.get();

        // Assert
        assertNotNull(activeUsers);
        assertEquals(1, activeUsers.size());
        assertEquals(testUser.getId(), activeUsers.get(0).getId());
        
        verify(userRepository).findAllActive();
        verify(metricsService).recordUserListQuery("active", 1);
    }
}
