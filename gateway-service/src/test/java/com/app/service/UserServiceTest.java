package com.app.service;

import com.app.model.ChildProfile;
import com.app.model.User;
import com.app.model.UserPreferences;
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
        
        // Create test user
        testUser = new User();
        testUser.setId("test-user-id");
        testUser.setEmail("test@example.com");
        testUser.setName("Test User");
        testUser.setPicture("https://example.com/picture.jpg");
        testUser.setProvider("google");
        testUser.setProviderId("google-123");
        testUser.setCreatedAt(Instant.now());
        testUser.setUpdatedAt(Instant.now());
        testUser.setActive(true);
        testUser.setLastLogin(Instant.now());
        
        // Setup preferences
        UserPreferences preferences = new UserPreferences();
        preferences.setNotificationsEnabled(true);
        preferences.setScreenTimeLimit(60);
        testUser.setPreferences(preferences);
        
        // Setup children
        List<ChildProfile> children = new ArrayList<>();
        ChildProfile child = new ChildProfile();
        child.setId("child-1");
        child.setName("Test Child");
        child.setAge(5);
        child.setCreatedAt(Instant.now());
        children.add(child);
        testUser.setChildren(children);
    }

    @Test
    void createUser_Success() throws Exception {
        // Arrange
        when(userRepository.save(any(User.class))).thenReturn(CompletableFuture.completedFuture(testUser));

        // Act
        CompletableFuture<User> result = userService.createUser(
                testUser.getEmail(),
                testUser.getName(),
                testUser.getPicture(),
                testUser.getProvider(),
                testUser.getProviderId()
        );
        User createdUser = result.get();

        // Assert
        assertNotNull(createdUser);
        assertEquals(testUser.getEmail(), createdUser.getEmail());
        assertEquals(testUser.getName(), createdUser.getName());
        assertEquals(testUser.getProvider(), createdUser.getProvider());
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
        when(userRepository.save(any(User.class)))
                .thenReturn(CompletableFuture.failedFuture(new RuntimeException("Database error")));

        // Act & Assert
        CompletableFuture<User> result = userService.createUser(
                testUser.getEmail(),
                testUser.getName(),
                testUser.getPicture(),
                testUser.getProvider(),
                testUser.getProviderId()
        );
        
        assertThrows(RuntimeException.class, () -> result.get());
        
        // Verify error metrics
        verify(metricsService).recordUserCreationError(testUser.getProvider(), "RuntimeException");
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
        assertEquals(testUser.getEmail(), foundUser.get().getEmail());
        
        // Verify repository interaction
        verify(userRepository).findById(testUser.getId());
        
        // Verify metrics
        verify(metricsService).recordUserLookup("id", true);
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
        verify(metricsService).recordUserLookup("id", false);
    }

    @Test
    void getUserByEmail_Success() throws Exception {
        // Arrange
        when(userRepository.findByEmail(testUser.getEmail()))
                .thenReturn(CompletableFuture.completedFuture(Optional.of(testUser)));

        // Act
        CompletableFuture<Optional<User>> result = userService.getUserByEmail(testUser.getEmail());
        Optional<User> foundUser = result.get();

        // Assert
        assertTrue(foundUser.isPresent());
        assertEquals(testUser.getEmail(), foundUser.get().getEmail());
        
        // Verify repository interaction
        verify(userRepository).findByEmail(testUser.getEmail());
        
        // Verify metrics
        verify(metricsService).recordUserLookup("email", true);
    }

    @Test
    void getOrCreateUser_ExistingUser() throws Exception {
        // Arrange
        when(userRepository.findByProviderAndProviderId(testUser.getProvider(), testUser.getProviderId()))
                .thenReturn(CompletableFuture.completedFuture(Optional.of(testUser)));
        when(userRepository.updateLastLogin(testUser.getId(), any(Instant.class)))
                .thenReturn(CompletableFuture.completedFuture(null));

        // Act
        CompletableFuture<User> result = userService.getOrCreateUser(
                testUser.getEmail(),
                testUser.getName(),
                testUser.getPicture(),
                testUser.getProvider(),
                testUser.getProviderId()
        );
        User user = result.get();

        // Assert
        assertNotNull(user);
        assertEquals(testUser.getId(), user.getId());
        assertEquals(testUser.getEmail(), user.getEmail());
        
        // Verify repository interactions
        verify(userRepository).findByProviderAndProviderId(testUser.getProvider(), testUser.getProviderId());
        verify(userRepository).updateLastLogin(eq(testUser.getId()), any(Instant.class));
        verify(userRepository, never()).save(any(User.class));
        
        // Verify metrics
        verify(metricsService).recordUserLogin(testUser.getProvider(), false); // false = existing user
    }

    @Test
    void getOrCreateUser_NewUser() throws Exception {
        // Arrange
        when(userRepository.findByProviderAndProviderId(testUser.getProvider(), testUser.getProviderId()))
                .thenReturn(CompletableFuture.completedFuture(Optional.empty()));
        when(userRepository.save(any(User.class)))
                .thenReturn(CompletableFuture.completedFuture(testUser));

        // Act
        CompletableFuture<User> result = userService.getOrCreateUser(
                testUser.getEmail(),
                testUser.getName(),
                testUser.getPicture(),
                testUser.getProvider(),
                testUser.getProviderId()
        );
        User user = result.get();

        // Assert
        assertNotNull(user);
        assertEquals(testUser.getEmail(), user.getEmail());
        assertEquals(testUser.getName(), user.getName());
        
        // Verify repository interactions
        verify(userRepository).findByProviderAndProviderId(testUser.getProvider(), testUser.getProviderId());
        verify(userRepository).save(any(User.class));
        verify(userRepository, never()).updateLastLogin(anyString(), any(Instant.class));
        
        // Verify metrics
        verify(metricsService).recordUserCreated(testUser.getProvider());
        verify(metricsService).recordUserLogin(testUser.getProvider(), true); // true = new user
    }

    @Test
    void updateUserPreferences_Success() throws Exception {
        // Arrange
        UserPreferences newPreferences = new UserPreferences();
        newPreferences.setNotificationsEnabled(false);
        newPreferences.setScreenTimeLimit(120);
        
        when(userRepository.updatePreferences(testUser.getId(), newPreferences))
                .thenReturn(CompletableFuture.completedFuture(null));

        // Act
        CompletableFuture<Void> result = userService.updateUserPreferences(testUser.getId(), newPreferences);
        result.get();

        // Assert
        verify(userRepository).updatePreferences(testUser.getId(), newPreferences);
        verify(metricsService).recordUserPreferencesUpdate();
    }

    @Test
    void addChildProfile_Success() throws Exception {
        // Arrange
        ChildProfile newChild = new ChildProfile();
        newChild.setName("New Child");
        newChild.setAge(3);
        
        when(userRepository.addChild(eq(testUser.getId()), any(ChildProfile.class)))
                .thenReturn(CompletableFuture.completedFuture(null));

        // Act
        CompletableFuture<Void> result = userService.addChildProfile(testUser.getId(), newChild);
        result.get();

        // Assert
        verify(userRepository).addChild(eq(testUser.getId()), any(ChildProfile.class));
        verify(metricsService).recordChildProfileCreated();
    }

    @Test
    void removeChildProfile_Success() throws Exception {
        // Arrange
        String childId = "child-1";
        when(userRepository.removeChild(testUser.getId(), childId))
                .thenReturn(CompletableFuture.completedFuture(true));

        // Act
        CompletableFuture<Boolean> result = userService.removeChildProfile(testUser.getId(), childId);
        Boolean removed = result.get();

        // Assert
        assertTrue(removed);
        verify(userRepository).removeChild(testUser.getId(), childId);
        verify(metricsService).recordChildProfileRemoved(true);
    }

    @Test
    void removeChildProfile_NotFound() throws Exception {
        // Arrange
        String childId = "non-existent-child";
        when(userRepository.removeChild(testUser.getId(), childId))
                .thenReturn(CompletableFuture.completedFuture(false));

        // Act
        CompletableFuture<Boolean> result = userService.removeChildProfile(testUser.getId(), childId);
        Boolean removed = result.get();

        // Assert
        assertFalse(removed);
        verify(userRepository).removeChild(testUser.getId(), childId);
        verify(metricsService).recordChildProfileRemoved(false);
    }

    @Test
    void deactivateUser_Success() throws Exception {
        // Arrange
        when(userRepository.deactivateUser(testUser.getId()))
                .thenReturn(CompletableFuture.completedFuture(null));

        // Act
        CompletableFuture<Void> result = userService.deactivateUser(testUser.getId());
        result.get();

        // Assert
        verify(userRepository).deactivateUser(testUser.getId());
        verify(metricsService).recordUserDeactivated();
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
        verify(metricsService).recordUserListQuery(1);
    }
}
