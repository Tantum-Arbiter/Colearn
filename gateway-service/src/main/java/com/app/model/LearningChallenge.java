package com.app.model;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.google.cloud.firestore.annotation.PropertyName;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

@JsonInclude(JsonInclude.Include.NON_NULL)
public class LearningChallenge {

    @JsonProperty("challengeId")
    @PropertyName("challengeId")
    private String challengeId;

    @JsonProperty("briefInteractionId")
    @PropertyName("briefInteractionId")
    private String briefInteractionId;

    @JsonProperty("mechanicId")
    @PropertyName("mechanicId")
    private String mechanicId;

    @JsonProperty("family")
    @PropertyName("family")
    private String family;

    @JsonProperty("adapter")
    @PropertyName("adapter")
    private String adapter;

    @JsonProperty("assessmentMode")
    @PropertyName("assessmentMode")
    private String assessmentMode;

    @JsonProperty("audioDependent")
    @PropertyName("audioDependent")
    private boolean audioDependent;

    @JsonProperty("domain")
    @PropertyName("domain")
    private String domain;

    @JsonProperty("skillId")
    @PropertyName("skillId")
    private String skillId;

    @JsonProperty("copy")
    @PropertyName("copy")
    private Copy copy;

    @JsonProperty("items")
    @PropertyName("items")
    private List<Item> items;

    @JsonProperty("target")
    @PropertyName("target")
    private String target;

    @JsonProperty("byAge")
    @PropertyName("byAge")
    private Map<String, Band> byAge;

    @JsonProperty("stateAfter")
    @PropertyName("stateAfter")
    private StateAfter stateAfter;

    @JsonProperty("fallbackElementId")
    @PropertyName("fallbackElementId")
    private String fallbackElementId;

    @JsonProperty("allowSkip")
    @PropertyName("allowSkip")
    private boolean allowSkip;

    @JsonProperty("isMusicGate")
    @PropertyName("isMusicGate")
    private boolean musicGate;

    public LearningChallenge() {
        this.items = new ArrayList<>();
        this.byAge = new LinkedHashMap<>();
        this.allowSkip = true;
    }

    @JsonInclude(JsonInclude.Include.NON_NULL)
    public static class Copy {
        @JsonProperty("title")
        @PropertyName("title")
        private Map<String, LocalizedText> title;

        @JsonProperty("setupLine")
        @PropertyName("setupLine")
        private Map<String, LocalizedText> setupLine;

        @JsonProperty("instruction")
        @PropertyName("instruction")
        private Map<String, LocalizedText> instruction;

        @JsonProperty("successLine")
        @PropertyName("successLine")
        private Map<String, LocalizedText> successLine;

        @JsonProperty("onSkip")
        @PropertyName("onSkip")
        private Map<String, LocalizedText> onSkip;

        @JsonProperty("parentPrompt")
        @PropertyName("parentPrompt")
        private Map<String, LocalizedText> parentPrompt;

        @JsonProperty("hints")
        @PropertyName("hints")
        private List<Map<String, LocalizedText>> hints;

        public Copy() {
            this.hints = new ArrayList<>();
        }

        @PropertyName("title")
        public Map<String, LocalizedText> getTitle() { return title; }
        @PropertyName("title")
        public void setTitle(Map<String, LocalizedText> title) { this.title = title; }
        @PropertyName("setupLine")
        public Map<String, LocalizedText> getSetupLine() { return setupLine; }
        @PropertyName("setupLine")
        public void setSetupLine(Map<String, LocalizedText> setupLine) { this.setupLine = setupLine; }
        @PropertyName("instruction")
        public Map<String, LocalizedText> getInstruction() { return instruction; }
        @PropertyName("instruction")
        public void setInstruction(Map<String, LocalizedText> instruction) { this.instruction = instruction; }
        @PropertyName("successLine")
        public Map<String, LocalizedText> getSuccessLine() { return successLine; }
        @PropertyName("successLine")
        public void setSuccessLine(Map<String, LocalizedText> successLine) { this.successLine = successLine; }
        @PropertyName("onSkip")
        public Map<String, LocalizedText> getOnSkip() { return onSkip; }
        @PropertyName("onSkip")
        public void setOnSkip(Map<String, LocalizedText> onSkip) { this.onSkip = onSkip; }
        @PropertyName("parentPrompt")
        public Map<String, LocalizedText> getParentPrompt() { return parentPrompt; }
        @PropertyName("parentPrompt")
        public void setParentPrompt(Map<String, LocalizedText> parentPrompt) { this.parentPrompt = parentPrompt; }
        @PropertyName("hints")
        public List<Map<String, LocalizedText>> getHints() { return hints; }
        @PropertyName("hints")
        public void setHints(List<Map<String, LocalizedText>> hints) { this.hints = hints; }

        @Override
        public boolean equals(Object o) {
            if (this == o) return true;
            if (!(o instanceof Copy that)) return false;
            return Objects.equals(title, that.title) && Objects.equals(setupLine, that.setupLine)
                    && Objects.equals(instruction, that.instruction) && Objects.equals(successLine, that.successLine)
                    && Objects.equals(onSkip, that.onSkip) && Objects.equals(parentPrompt, that.parentPrompt)
                    && Objects.equals(hints, that.hints);
        }

        @Override
        public int hashCode() {
            return Objects.hash(title, setupLine, instruction, successLine, onSkip, parentPrompt, hints);
        }
    }

    @JsonInclude(JsonInclude.Include.NON_NULL)
    public static class Item {
        @JsonProperty("id")
        @PropertyName("id")
        private String id;

        @JsonProperty("image")
        @PropertyName("image")
        private String image;

        @JsonProperty("label")
        @PropertyName("label")
        private LocalizedText label;

        @JsonProperty("hotspot")
        @PropertyName("hotspot")
        private Hotspot hotspot;

        @JsonProperty("outcome")
        @PropertyName("outcome")
        private Outcome outcome;

        public Item() {}

        @PropertyName("id")
        public String getId() { return id; }
        @PropertyName("id")
        public void setId(String id) { this.id = id; }
        @PropertyName("image")
        public String getImage() { return image; }
        @PropertyName("image")
        public void setImage(String image) { this.image = image; }
        @PropertyName("label")
        public LocalizedText getLabel() { return label; }
        @PropertyName("label")
        public void setLabel(LocalizedText label) { this.label = label; }
        @PropertyName("hotspot")
        public Hotspot getHotspot() { return hotspot; }
        @PropertyName("hotspot")
        public void setHotspot(Hotspot hotspot) { this.hotspot = hotspot; }
        @PropertyName("outcome")
        public Outcome getOutcome() { return outcome; }
        @PropertyName("outcome")
        public void setOutcome(Outcome outcome) { this.outcome = outcome; }

        @Override
        public boolean equals(Object o) {
            if (this == o) return true;
            if (!(o instanceof Item that)) return false;
            return Objects.equals(id, that.id) && Objects.equals(image, that.image) && Objects.equals(label, that.label) && Objects.equals(hotspot, that.hotspot) && Objects.equals(outcome, that.outcome);
        }

        @Override
        public int hashCode() {
            return Objects.hash(id, image, label, hotspot, outcome);
        }
    }

    @JsonInclude(JsonInclude.Include.NON_NULL)
    public static class Hotspot {
        @JsonProperty("position")
        @PropertyName("position")
        private InteractiveElement.Position position;

        @JsonProperty("size")
        @PropertyName("size")
        private InteractiveElement.Size size;

        public Hotspot() {}

        @PropertyName("position")
        public InteractiveElement.Position getPosition() { return position; }
        @PropertyName("position")
        public void setPosition(InteractiveElement.Position position) { this.position = position; }
        @PropertyName("size")
        public InteractiveElement.Size getSize() { return size; }
        @PropertyName("size")
        public void setSize(InteractiveElement.Size size) { this.size = size; }

        @Override
        public boolean equals(Object o) {
            if (this == o) return true;
            if (!(o instanceof Hotspot that)) return false;
            return Objects.equals(position, that.position) && Objects.equals(size, that.size);
        }

        @Override
        public int hashCode() {
            return Objects.hash(position, size);
        }
    }

    @JsonInclude(JsonInclude.Include.NON_NULL)
    public static class Outcome {
        @JsonProperty("successLine")
        @PropertyName("successLine")
        private Map<String, LocalizedText> successLine;

        @JsonProperty("stateAfter")
        @PropertyName("stateAfter")
        private StateAfter stateAfter;

        @JsonProperty("tips")
        @PropertyName("tips")
        private List<Map<String, LocalizedText>> tips;

        @JsonProperty("storyText")
        @PropertyName("storyText")
        private Map<String, LocalizedText> storyText;

        public Outcome() {}

        @PropertyName("successLine")
        public Map<String, LocalizedText> getSuccessLine() { return successLine; }
        @PropertyName("successLine")
        public void setSuccessLine(Map<String, LocalizedText> successLine) { this.successLine = successLine; }
        @PropertyName("stateAfter")
        public StateAfter getStateAfter() { return stateAfter; }
        @PropertyName("stateAfter")
        public void setStateAfter(StateAfter stateAfter) { this.stateAfter = stateAfter; }
        @PropertyName("tips")
        public List<Map<String, LocalizedText>> getTips() { return tips; }
        @PropertyName("tips")
        public void setTips(List<Map<String, LocalizedText>> tips) { this.tips = tips; }
        @PropertyName("storyText")
        public Map<String, LocalizedText> getStoryText() { return storyText; }
        @PropertyName("storyText")
        public void setStoryText(Map<String, LocalizedText> storyText) { this.storyText = storyText; }

        @Override
        public boolean equals(Object o) {
            if (this == o) return true;
            if (!(o instanceof Outcome that)) return false;
            return Objects.equals(successLine, that.successLine) && Objects.equals(stateAfter, that.stateAfter) && Objects.equals(tips, that.tips)
                    && Objects.equals(storyText, that.storyText);
        }

        @Override
        public int hashCode() {
            return Objects.hash(successLine, stateAfter, tips, storyText);
        }
    }

    @JsonInclude(JsonInclude.Include.NON_NULL)
    public static class Band {
        @JsonProperty("gesture")
        @PropertyName("gesture")
        private String gesture;

        @JsonProperty("items")
        @PropertyName("items")
        private List<String> items;

        public Band() {
            this.items = new ArrayList<>();
        }

        @PropertyName("gesture")
        public String getGesture() { return gesture; }
        @PropertyName("gesture")
        public void setGesture(String gesture) { this.gesture = gesture; }
        @PropertyName("items")
        public List<String> getItems() { return items; }
        @PropertyName("items")
        public void setItems(List<String> items) { this.items = items; }

        @Override
        public boolean equals(Object o) {
            if (this == o) return true;
            if (!(o instanceof Band that)) return false;
            return Objects.equals(gesture, that.gesture) && Objects.equals(items, that.items);
        }

        @Override
        public int hashCode() {
            return Objects.hash(gesture, items);
        }
    }

    @JsonInclude(JsonInclude.Include.NON_NULL)
    public static class StateAfter {
        @JsonProperty("image")
        @PropertyName("image")
        private String image;

        @JsonProperty("position")
        @PropertyName("position")
        private InteractiveElement.Position position;

        @JsonProperty("size")
        @PropertyName("size")
        private InteractiveElement.Size size;

        public StateAfter() {}

        @PropertyName("image")
        public String getImage() { return image; }
        @PropertyName("image")
        public void setImage(String image) { this.image = image; }
        @PropertyName("position")
        public InteractiveElement.Position getPosition() { return position; }
        @PropertyName("position")
        public void setPosition(InteractiveElement.Position position) { this.position = position; }
        @PropertyName("size")
        public InteractiveElement.Size getSize() { return size; }
        @PropertyName("size")
        public void setSize(InteractiveElement.Size size) { this.size = size; }

        @Override
        public boolean equals(Object o) {
            if (this == o) return true;
            if (!(o instanceof StateAfter that)) return false;
            return Objects.equals(image, that.image) && Objects.equals(position, that.position) && Objects.equals(size, that.size);
        }

        @Override
        public int hashCode() {
            return Objects.hash(image, position, size);
        }
    }

    @PropertyName("challengeId")
    public String getChallengeId() { return challengeId; }
    @PropertyName("challengeId")
    public void setChallengeId(String challengeId) { this.challengeId = challengeId; }
    @PropertyName("briefInteractionId")
    public String getBriefInteractionId() { return briefInteractionId; }
    @PropertyName("briefInteractionId")
    public void setBriefInteractionId(String briefInteractionId) { this.briefInteractionId = briefInteractionId; }
    @PropertyName("mechanicId")
    public String getMechanicId() { return mechanicId; }
    @PropertyName("mechanicId")
    public void setMechanicId(String mechanicId) { this.mechanicId = mechanicId; }
    @PropertyName("family")
    public String getFamily() { return family; }
    @PropertyName("family")
    public void setFamily(String family) { this.family = family; }
    @PropertyName("adapter")
    public String getAdapter() { return adapter; }
    @PropertyName("adapter")
    public void setAdapter(String adapter) { this.adapter = adapter; }
    @PropertyName("assessmentMode")
    public String getAssessmentMode() { return assessmentMode; }
    @PropertyName("assessmentMode")
    public void setAssessmentMode(String assessmentMode) { this.assessmentMode = assessmentMode; }
    @PropertyName("audioDependent")
    public boolean isAudioDependent() { return audioDependent; }
    @PropertyName("audioDependent")
    public void setAudioDependent(boolean audioDependent) { this.audioDependent = audioDependent; }
    @PropertyName("domain")
    public String getDomain() { return domain; }
    @PropertyName("domain")
    public void setDomain(String domain) { this.domain = domain; }
    @PropertyName("skillId")
    public String getSkillId() { return skillId; }
    @PropertyName("skillId")
    public void setSkillId(String skillId) { this.skillId = skillId; }
    @PropertyName("copy")
    public Copy getCopy() { return copy; }
    @PropertyName("copy")
    public void setCopy(Copy copy) { this.copy = copy; }
    @PropertyName("items")
    public List<Item> getItems() { return items; }
    @PropertyName("items")
    public void setItems(List<Item> items) { this.items = items; }
    @PropertyName("target")
    public String getTarget() { return target; }
    @PropertyName("target")
    public void setTarget(String target) { this.target = target; }
    @PropertyName("byAge")
    public Map<String, Band> getByAge() { return byAge; }
    @PropertyName("byAge")
    public void setByAge(Map<String, Band> byAge) { this.byAge = byAge; }
    @PropertyName("stateAfter")
    public StateAfter getStateAfter() { return stateAfter; }
    @PropertyName("stateAfter")
    public void setStateAfter(StateAfter stateAfter) { this.stateAfter = stateAfter; }
    @PropertyName("fallbackElementId")
    public String getFallbackElementId() { return fallbackElementId; }
    @PropertyName("fallbackElementId")
    public void setFallbackElementId(String fallbackElementId) { this.fallbackElementId = fallbackElementId; }
    @PropertyName("allowSkip")
    public boolean isAllowSkip() { return allowSkip; }
    @PropertyName("allowSkip")
    public void setAllowSkip(boolean allowSkip) { this.allowSkip = allowSkip; }
    @PropertyName("isMusicGate")
    public boolean isMusicGate() { return musicGate; }
    @PropertyName("isMusicGate")
    public void setMusicGate(boolean musicGate) { this.musicGate = musicGate; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof LearningChallenge that)) return false;
        return audioDependent == that.audioDependent && allowSkip == that.allowSkip && musicGate == that.musicGate
                && Objects.equals(challengeId, that.challengeId) && Objects.equals(briefInteractionId, that.briefInteractionId)
                && Objects.equals(mechanicId, that.mechanicId) && Objects.equals(family, that.family)
                && Objects.equals(adapter, that.adapter) && Objects.equals(assessmentMode, that.assessmentMode)
                && Objects.equals(domain, that.domain) && Objects.equals(skillId, that.skillId)
                && Objects.equals(copy, that.copy) && Objects.equals(items, that.items) && Objects.equals(target, that.target)
                && Objects.equals(byAge, that.byAge) && Objects.equals(stateAfter, that.stateAfter)
                && Objects.equals(fallbackElementId, that.fallbackElementId);
    }

    @Override
    public int hashCode() {
        return Objects.hash(challengeId, briefInteractionId, mechanicId, family, adapter, assessmentMode, audioDependent, domain,
                skillId, copy, items, target, byAge, stateAfter, fallbackElementId, allowSkip, musicGate);
    }
}
