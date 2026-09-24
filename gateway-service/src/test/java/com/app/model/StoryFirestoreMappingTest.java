package com.app.model;

import com.google.cloud.firestore.encoding.CustomClassMapper;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class StoryFirestoreMappingTest {

    @ParameterizedTest
    @ValueSource(strings = {"isPremium", "isFree", "isReferralReward", "isAvailable"})
    void storesEachFlagUnderTheNameTheCmsUses(String flag) {
        Story story = new Story();
        story.setPremium(true);
        story.setFree(true);
        story.setReferralReward(true);
        story.setAvailable(true);

        @SuppressWarnings("unchecked")
        Map<String, Object> stored = (Map<String, Object>) CustomClassMapper.serialize(story);

        assertEquals(Boolean.TRUE, stored.get(flag), flag + " in " + stored.keySet());
        assertFalse(stored.containsKey(flag.substring(2, 3).toLowerCase() + flag.substring(3)),
                "stored a second, unprefixed copy of " + flag);
    }

    @ParameterizedTest
    @ValueSource(strings = {"isPremium", "isFree", "isReferralReward", "isAvailable"})
    void readsEachFlagTheCmsWrote(String flag) {
        Story underTest = CustomClassMapper.convertToCustomClass(Map.of("id", "s", flag, true), Story.class, null);

        boolean value = switch (flag) {
            case "isPremium" -> underTest.isPremium();
            case "isFree" -> underTest.isFree();
            case "isReferralReward" -> underTest.isReferralReward();
            default -> underTest.isAvailable();
        };
        assertTrue(value, flag);
    }

    @ParameterizedTest
    @ValueSource(strings = {"isPremium", "isFree", "isReferralReward", "isAvailable"})
    void survivesAWriteThenRead(String flag) {
        Story story = CustomClassMapper.convertToCustomClass(Map.of("id", "s", flag, true), Story.class, null);

        Story underTest = CustomClassMapper.convertToCustomClass(CustomClassMapper.serialize(story), Story.class, null);

        assertEquals(CustomClassMapper.serialize(story), CustomClassMapper.serialize(underTest));
    }

    @ParameterizedTest
    @ValueSource(strings = {"_usageType", "_disclaimer"})
    void keepsTheCmsUnderscoreFieldsUnderTheirOwnNames(String field) {
        Story story = CustomClassMapper.convertToCustomClass(Map.of("id", "s", field, "value"), Story.class, null);

        @SuppressWarnings("unchecked")
        Map<String, Object> stored = (Map<String, Object>) CustomClassMapper.serialize(story);

        assertEquals("value", stored.get(field));
        assertFalse(stored.containsKey(field.substring(1)));
    }
}
