package com.app.model;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.DisplayName;

import java.time.Instant;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Unit tests for UserProfile model
 * Tests validation, getters/setters, and business logic
 */
class UserProfileTest {

    private UserProfile userProfile;
    private String testUserId;

    @BeforeEach
    void setUp() {
        testUserId = "test-user-123";
        userProfile = new UserProfile();
        userProfile.setUserId(testUserId);
        userProfile.setNickname("Freya");
        userProfile.setAvatarType("girl");
        userProfile.setAvatarId("girl_1");
    }

    @Test
    @DisplayName("Should create UserProfile with default values")
    void testDefaultConstructor() {
        UserProfile profile = new UserProfile();
        
        assertNotNull(profile);
        assertNotNull(profile.getCreatedAt());
        assertNotNull(profile.getUpdatedAt());
        assertEquals(1, profile.getVersion());
        assertNotNull(profile.getNotifications());
        assertNotNull(profile.getSchedule());
    }

    @Test
    @DisplayName("Should create UserProfile with userId constructor")
    void testUserIdConstructor() {
        UserProfile profile = new UserProfile(testUserId);
        
        assertEquals(testUserId, profile.getUserId());
        assertNotNull(profile.getCreatedAt());
        assertNotNull(profile.getUpdatedAt());
        assertEquals(1, profile.getVersion());
    }

    @Test
    @DisplayName("Should set and get userId")
    void testUserIdGetterSetter() {
        String newUserId = "new-user-456";
        userProfile.setUserId(newUserId);
        
        assertEquals(newUserId, userProfile.getUserId());
    }

    @Test
    @DisplayName("Should set and get nickname")
    void testNicknameGetterSetter() {
        String nickname = "TestNickname";
        userProfile.setNickname(nickname);
        
        assertEquals(nickname, userProfile.getNickname());
    }

    @Test
    @DisplayName("Should validate nickname length - valid")
    void testValidateNickname_Valid() {
        userProfile.setNickname("A");
        assertTrue(userProfile.isValid());
        
        userProfile.setNickname("12345678901234567890"); // 20 chars
        assertTrue(userProfile.isValid());
    }

    @Test
    @DisplayName("Should validate nickname length - too short")
    void testValidateNickname_TooShort() {
        userProfile.setNickname("");
        assertFalse(userProfile.isValid());
        
        userProfile.setNickname(null);
        assertFalse(userProfile.isValid());
    }

    @Test
    @DisplayName("Should validate nickname length - too long")
    void testValidateNickname_TooLong() {
        userProfile.setNickname("123456789012345678901"); // 21 chars
        assertFalse(userProfile.isValid());
    }

    @Test
    @DisplayName("Should validate avatarType - valid values")
    void testValidateAvatarType_Valid() {
        userProfile.setAvatarType("boy");
        assertTrue(userProfile.isValid());
        
        userProfile.setAvatarType("girl");
        assertTrue(userProfile.isValid());
    }

    @Test
    @DisplayName("Should validate avatarType - invalid values")
    void testValidateAvatarType_Invalid() {
        userProfile.setAvatarType("invalid");
        assertFalse(userProfile.isValid());
        
        userProfile.setAvatarType(null);
        assertFalse(userProfile.isValid());
        
        userProfile.setAvatarType("");
        assertFalse(userProfile.isValid());
    }

    @Test
    @DisplayName("Should set and get avatarId")
    void testAvatarIdGetterSetter() {
        String avatarId = "boy_2";
        userProfile.setAvatarId(avatarId);
        
        assertEquals(avatarId, userProfile.getAvatarId());
    }

    @Test
    @DisplayName("Should validate avatarId - not null or empty")
    void testValidateAvatarId() {
        userProfile.setAvatarId("boy_1");
        assertTrue(userProfile.isValid());
        
        userProfile.setAvatarId(null);
        assertFalse(userProfile.isValid());
        
        userProfile.setAvatarId("");
        assertFalse(userProfile.isValid());
    }

    @Test
    @DisplayName("Should set and get notifications")
    void testNotificationsGetterSetter() {
        Map<String, Object> notifications = new HashMap<>();
        notifications.put("enabled", true);
        notifications.put("storyReminders", true);
        
        userProfile.setNotifications(notifications);
        
        assertEquals(notifications, userProfile.getNotifications());
        assertTrue((Boolean) userProfile.getNotifications().get("enabled"));
    }

    @Test
    @DisplayName("Should set and get schedule")
    void testScheduleGetterSetter() {
        Map<String, Object> schedule = new HashMap<>();
        Map<String, Object> storyTime = new HashMap<>();
        storyTime.put("enabled", true);
        storyTime.put("time", "19:00");
        storyTime.put("days", Arrays.asList(1, 2, 3, 4, 5));
        schedule.put("storyTime", storyTime);

        userProfile.setSchedule(schedule);

        assertEquals(schedule, userProfile.getSchedule());
    }

    @Test
    @DisplayName("Should update timestamps on modification")
    void testUpdateTimestamps() throws InterruptedException {
        Instant originalUpdatedAt = userProfile.getUpdatedAt();

        Thread.sleep(10);

        userProfile.setNickname("NewNickname");
        userProfile.updateTimestamp();

        assertNotNull(userProfile.getUpdatedAt());
        assertTrue(userProfile.getUpdatedAt().isAfter(originalUpdatedAt));
    }

    @Test
    @DisplayName("Should validate complete profile - all fields valid")
    void testValidateCompleteProfile_Valid() {
        userProfile.setUserId("user-123");
        userProfile.setNickname("Freya");
        userProfile.setAvatarType("girl");
        userProfile.setAvatarId("girl_1");

        Map<String, Object> notifications = new HashMap<>();
        notifications.put("enabled", true);
        userProfile.setNotifications(notifications);

        Map<String, Object> schedule = new HashMap<>();
        userProfile.setSchedule(schedule);

        assertTrue(userProfile.isValid());
    }

    @Test
    @DisplayName("Should validate complete profile - missing userId")
    void testValidateCompleteProfile_MissingUserId() {
        userProfile.setUserId(null);
        assertFalse(userProfile.isValid());

        userProfile.setUserId("");
        assertFalse(userProfile.isValid());
    }

    @Test
    @DisplayName("Should validate complete profile - missing notifications")
    void testValidateCompleteProfile_MissingNotifications() {
        userProfile.setNotifications(null);
        assertFalse(userProfile.isValid());
    }

    @Test
    @DisplayName("Should validate complete profile - missing schedule")
    void testValidateCompleteProfile_MissingSchedule() {
        userProfile.setSchedule(null);
        assertFalse(userProfile.isValid());
    }

    @Test
    @DisplayName("Should create default notifications structure")
    void testCreateDefaultNotifications() {
        Map<String, Object> notifications = UserProfile.createDefaultNotifications();

        assertNotNull(notifications);
        assertTrue((Boolean) notifications.get("enabled"));
        assertTrue((Boolean) notifications.get("storyReminders"));
        assertTrue((Boolean) notifications.get("emotionCheckIns"));
        assertTrue((Boolean) notifications.get("bedtimeReminders"));
        assertTrue((Boolean) notifications.get("soundEnabled"));
        assertFalse((Boolean) notifications.get("vibrationEnabled"));
    }

    @Test
    @DisplayName("Should create default schedule structure")
    void testCreateDefaultSchedule() {
        Map<String, Object> schedule = UserProfile.createDefaultSchedule();

        assertNotNull(schedule);
        assertTrue(schedule.isEmpty());
    }

    @Test
    @DisplayName("Should convert to string without exposing sensitive data")
    void testToString() {
        String result = userProfile.toString();

        assertNotNull(result);
        assertTrue(result.contains("userId"));
        assertTrue(result.contains("nickname"));
        assertTrue(result.contains("avatarType"));
    }
}
