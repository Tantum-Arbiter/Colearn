package com.app.dto;

import com.app.model.Story;
import com.app.model.StoryPage;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;

class CatalogEntryTest {

    private static final ObjectMapper MAPPER = new ObjectMapper();

    private static Story story(Integer pageCount, int pages) {
        Story story = new Story();
        story.setId("snowy");
        story.setPageCount(pageCount);
        story.setPages(java.util.stream.IntStream.range(0, pages).mapToObj(i -> new StoryPage("p" + i, i, "t")).toList());
        return story;
    }

    @Test
    void carriesTheStorysPageCount() {
        assertEquals(12, CatalogEntry.fromStory(story(12, 12), null).getPageCount());
    }

    @Test
    void countsThePagesWhenTheStoryHasNoPageCount() {
        assertEquals(7, CatalogEntry.fromStory(story(null, 7), null).getPageCount());
    }

    @Test
    void hasNoPageCountForAStoryWithNoPages() {
        Story story = story(null, 0);
        story.setPages(null);

        assertNull(CatalogEntry.fromStory(story, null).getPageCount());
    }

    @Test
    void sendsPageCountAndNeverDuration() throws Exception {
        JsonNode sent = MAPPER.valueToTree(CatalogEntry.fromStory(story(12, 12), null));

        assertEquals(12, sent.get("pageCount").asInt());
        assertFalse(sent.has("duration"));
    }

    @Test
    void storySendsPageCountAndNeverDuration() throws Exception {
        JsonNode sent = new ObjectMapper().findAndRegisterModules().valueToTree(story(12, 12));

        assertEquals(12, sent.get("pageCount").asInt());
        assertFalse(sent.has("duration"));
    }

    @Test
    void emptyTagListsSurvive() {
        Story story = story(1, 1);
        story.setTags(List.of());

        assertEquals(List.of(), CatalogEntry.fromStory(story, null).getTags());
    }
}
