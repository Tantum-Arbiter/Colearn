package com.app.dto;

import com.app.model.Child;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonInclude;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@JsonIgnoreProperties(ignoreUnknown = true)
@JsonInclude(JsonInclude.Include.NON_NULL)
public record ChildDocument(
        String childId,
        @Size(min = 1, max = 20) @Pattern(regexp = ".*\\S.*", message = "must not be blank") String nickname,
        @Pattern(regexp = "boy|girl") String avatarType,
        @Size(min = 1, max = 40) @Pattern(regexp = "[a-z0-9-]+") String avatarId,
        @Pattern(regexp = "0-2|2-4|4-6") String ageBucket,
        @Pattern(regexp = "en|pl|es|de|fr|it|pt|ja|ar|tr|nl|da|la|zh") String language,
        @DecimalMin("0.5") @DecimalMax("2.0") Double textSizeScale,
        @Valid Favorites favorites,
        @Size(max = 1000) Map<@Pattern(regexp = ID) String, @Valid @NotNull ProgressEntry> storyProgress,
        @Size(max = 1000) List<@Pattern(regexp = ID) String> finishedStoryIds,
        @Size(max = 3) Map<@Pattern(regexp = "music|jigsaw|reading") String, @NotNull @Min(0) @Max(1_000_000) Long> challengeCounts,
        @Size(max = 500) List<@Pattern(regexp = ID) String> achievements,
        @Valid Settings settings,
        @NotNull @Min(0) Long version
) {

    public static final String ID = "[A-Za-z0-9_-]{1,100}";

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Favorites(
            @Size(max = 500) List<@Pattern(regexp = ID) String> stories,
            @Size(max = 500) List<@Pattern(regexp = ID) String> activities,
            @Size(max = 500) List<@Pattern(regexp = ID) String> songs
    ) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record ProgressEntry(
            @NotNull @Min(0) @Max(1000) Long pageIndex,
            @NotNull @Min(0) @Max(1000) Long totalPages,
            @NotNull @Min(0) @Max(100_000) Long finishedCount
    ) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Settings(
            Boolean screenTimeEnabled,
            Boolean smartRemindersEnabled,
            @Size(max = 50) List<@Valid @NotNull Reminder> customReminders
    ) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Reminder(
            @NotBlank @Size(max = 100) String id,
            @NotBlank @Size(max = 100) String title,
            @Size(max = 500) String message,
            @NotNull @Min(0) @Max(6) Long dayOfWeek,
            @NotNull @Pattern(regexp = "([01]\\d|2[0-3]):[0-5]\\d") String time,
            @NotNull Boolean isActive
    ) {
    }

    public Child toModel(String id) {
        Child child = new Child();
        child.setChildId(id);
        child.setNickname(nickname);
        child.setAvatarType(avatarType);
        child.setAvatarId(avatarId);
        child.setAgeBucket(ageBucket);
        child.setLanguage(language);
        child.setTextSizeScale(textSizeScale);
        Child.Favorites fav = new Child.Favorites();
        if (favorites != null) {
            fav.setStories(copy(favorites.stories()));
            fav.setActivities(copy(favorites.activities()));
            fav.setSongs(copy(favorites.songs()));
        }
        child.setFavorites(fav);
        Map<String, Child.StoryProgressEntry> progress = new LinkedHashMap<>();
        if (storyProgress != null) {
            storyProgress.forEach((storyId, entry) -> {
                Child.StoryProgressEntry e = new Child.StoryProgressEntry();
                e.setPageIndex(entry.pageIndex());
                e.setTotalPages(entry.totalPages());
                e.setFinishedCount(entry.finishedCount());
                progress.put(storyId, e);
            });
        }
        child.setStoryProgress(progress);
        child.setFinishedStoryIds(copy(finishedStoryIds));
        child.setChallengeCounts(challengeCounts == null ? new LinkedHashMap<>() : new LinkedHashMap<>(challengeCounts));
        child.setAchievements(copy(achievements));
        Child.Settings s = new Child.Settings();
        if (settings != null) {
            s.setScreenTimeEnabled(settings.screenTimeEnabled());
            s.setSmartRemindersEnabled(settings.smartRemindersEnabled());
            List<Child.Reminder> reminders = new ArrayList<>();
            if (settings.customReminders() != null) {
                for (Reminder r : settings.customReminders()) {
                    Child.Reminder m = new Child.Reminder();
                    m.setId(r.id());
                    m.setTitle(r.title());
                    m.setMessage(r.message());
                    m.setDayOfWeek(r.dayOfWeek());
                    m.setTime(r.time());
                    m.setActive(r.isActive());
                    reminders.add(m);
                }
            }
            s.setCustomReminders(reminders);
        }
        child.setSettings(s);
        child.setVersion(version == null ? 0 : version);
        return child;
    }

    public static ChildDocument fromModel(Child child) {
        Child.Favorites fav = child.getFavorites() == null ? new Child.Favorites() : child.getFavorites();
        Map<String, ProgressEntry> progress = new LinkedHashMap<>();
        if (child.getStoryProgress() != null) {
            child.getStoryProgress().forEach((id, e) ->
                    progress.put(id, new ProgressEntry(e.getPageIndex(), e.getTotalPages(), e.getFinishedCount())));
        }
        Child.Settings s = child.getSettings() == null ? new Child.Settings() : child.getSettings();
        List<Reminder> reminders = new ArrayList<>();
        if (s.getCustomReminders() != null) {
            for (Child.Reminder r : s.getCustomReminders()) {
                reminders.add(new Reminder(r.getId(), r.getTitle(), r.getMessage(), r.getDayOfWeek(), r.getTime(), r.isActive()));
            }
        }
        return new ChildDocument(
                child.getChildId(),
                child.getNickname(),
                child.getAvatarType(),
                child.getAvatarId(),
                child.getAgeBucket(),
                child.getLanguage(),
                child.getTextSizeScale(),
                new Favorites(copy(fav.getStories()), copy(fav.getActivities()), copy(fav.getSongs())),
                progress,
                copy(child.getFinishedStoryIds()),
                child.getChallengeCounts() == null ? new LinkedHashMap<>() : new LinkedHashMap<>(child.getChallengeCounts()),
                copy(child.getAchievements()),
                new Settings(s.getScreenTimeEnabled(), s.getSmartRemindersEnabled(), reminders),
                child.getVersion());
    }

    private static List<String> copy(List<String> list) {
        return list == null ? new ArrayList<>() : new ArrayList<>(list);
    }
}
