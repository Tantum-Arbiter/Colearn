package com.app.controller;

import com.app.dto.ChildDocument;
import com.app.exception.ErrorCode;
import com.app.exception.GatewayException;
import com.app.model.Child;
import com.app.model.UserProfile;
import com.app.repository.ChildRepository;
import com.app.repository.UserProfileRepository;
import com.app.security.AuthenticatedUser;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;

@RestController
@RequestMapping("/api/children")
public class ChildController {

    static final String DEFAULT_CHILD_ID = "default";
    private static final Pattern CHILD_ID = Pattern.compile("[a-z0-9][a-z0-9-]{0,39}");
    private static final Pattern TIME = Pattern.compile("([01]\\d|2[0-3]):[0-5]\\d");

    private final ChildRepository childRepository;
    private final UserProfileRepository userProfileRepository;

    public ChildController(ChildRepository childRepository, UserProfileRepository userProfileRepository) {
        this.childRepository = childRepository;
        this.userProfileRepository = userProfileRepository;
    }

    @GetMapping
    public Map<String, List<ChildDocument>> list() {
        String userId = AuthenticatedUser.id();
        List<ChildDocument> children = childRepository.findAll(userId).join().stream().map(ChildDocument::fromModel).toList();
        if (children.isEmpty()) {
            children = userProfileRepository.findByUserId(userId).join()
                    .map(profile -> List.of(ChildDocument.fromModel(fromLegacyProfile(profile))))
                    .orElse(List.of());
        }
        return Map.of("children", children);
    }

    @GetMapping("/{childId}")
    public ChildDocument get(@PathVariable String childId) {
        requireValidId(childId);
        return childRepository.find(AuthenticatedUser.id(), childId).join()
                .map(ChildDocument::fromModel)
                .orElseThrow(() -> new GatewayException(ErrorCode.CHILD_PROFILE_NOT_FOUND, "Child not found"));
    }

    @PutMapping("/{childId}")
    public ResponseEntity<ChildDocument> put(@PathVariable String childId, @Valid @RequestBody ChildDocument body) {
        requireValidId(childId);
        String userId = AuthenticatedUser.id();
        ChildRepository.PutResult result = childRepository.putIfVersion(userId, body.toModel(childId), body.version()).join();
        return switch (result) {
            case ChildRepository.Saved saved -> ResponseEntity.ok(ChildDocument.fromModel(saved.child()));
            case ChildRepository.Conflict conflict -> throw new GatewayException(ErrorCode.CHILD_VERSION_CONFLICT,
                    "The child has changed on another device; merge and try again",
                    conflict.current() == null ? Map.of() : Map.of("current", ChildDocument.fromModel(conflict.current())));
            case ChildRepository.LimitReached limit -> throw new GatewayException(ErrorCode.CHILD_LIMIT_REACHED,
                    "An account can hold at most " + limit.limit() + " children", Map.of("limit", limit.limit()));
        };
    }

    private static void requireValidId(String childId) {
        if (childId == null || !CHILD_ID.matcher(childId).matches()) {
            throw new GatewayException(ErrorCode.FIELD_VALIDATION_FAILED, "Invalid child id");
        }
    }

    static Child fromLegacyProfile(UserProfile profile) {
        Child child = new Child();
        child.setChildId(DEFAULT_CHILD_ID);
        child.setNickname(profile.getNickname());
        child.setAvatarType(profile.getAvatarType());
        child.setAvatarId(profile.getAvatarId());
        Map<String, Object> notifications = profile.getNotifications() == null ? Map.of() : profile.getNotifications();
        Map<String, Object> schedule = profile.getSchedule() == null ? Map.of() : profile.getSchedule();
        child.setAgeBucket(switch (String.valueOf(schedule.get("childAgeRange"))) {
            case "18-24m" -> "0-2";
            case "2-6y", "6+" -> "4-6";
            default -> null;
        });
        Child.Settings settings = new Child.Settings();
        if (notifications.get("screenTimeEnabled") instanceof Boolean on) {
            settings.setScreenTimeEnabled(on);
        }
        if (notifications.get("smartRemindersEnabled") instanceof Boolean on) {
            settings.setSmartRemindersEnabled(on);
        }
        List<Child.Reminder> reminders = new ArrayList<>();
        if (schedule.get("customReminders") instanceof List<?> legacy) {
            for (Object item : legacy) {
                if (item instanceof Map<?, ?> map) {
                    Child.Reminder reminder = legacyReminder(map);
                    if (reminder != null) {
                        reminders.add(reminder);
                    }
                }
            }
        }
        settings.setCustomReminders(reminders);
        child.setSettings(settings);
        child.setVersion(0);
        return child;
    }

    private static Child.Reminder legacyReminder(Map<?, ?> map) {
        if (!(map.get("id") instanceof String id) || !(map.get("title") instanceof String title)
                || !(map.get("time") instanceof String time) || !TIME.matcher(time).matches()
                || !(map.get("dayOfWeek") instanceof Number day) || day.longValue() < 0 || day.longValue() > 6) {
            return null;
        }
        Child.Reminder reminder = new Child.Reminder();
        reminder.setId(id);
        reminder.setTitle(title);
        reminder.setMessage(map.get("message") instanceof String message ? message : "");
        reminder.setDayOfWeek(day.longValue());
        reminder.setTime(time);
        reminder.setActive(!(map.get("isActive") instanceof Boolean active) || active);
        return reminder;
    }
}
