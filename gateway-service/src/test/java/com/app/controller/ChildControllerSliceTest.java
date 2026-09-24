package com.app.controller;

import com.app.config.JwtConfig;
import com.app.model.Child;
import com.app.model.UserProfile;
import com.app.repository.ChildRepository;
import com.app.repository.UserProfileRepository;
import com.app.security.RateLimitingFilter;
import com.app.testsupport.SecuredWebMvcTest;
import com.app.testsupport.TestTokens;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.CompletableFuture;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = ChildController.class)
@SecuredWebMvcTest
class ChildControllerSliceTest {

    private static final String USER = "user-9";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JwtConfig jwtConfig;

    @Autowired
    private RateLimitingFilter rateLimitingFilter;

    @MockitoBean
    private ChildRepository childRepository;

    @MockitoBean
    private UserProfileRepository userProfileRepository;

    @BeforeEach
    void setUp() {
        rateLimitingFilter.resetForTests();
        when(childRepository.findAll(USER)).thenReturn(CompletableFuture.completedFuture(List.of()));
        when(userProfileRepository.findByUserId(USER)).thenReturn(CompletableFuture.completedFuture(Optional.empty()));
        when(childRepository.putIfVersion(eq(USER), any(), anyLong())).thenAnswer(inv -> {
            Child child = inv.getArgument(1);
            child.setVersion((long) inv.getArgument(2) + 1);
            return CompletableFuture.completedFuture(new ChildRepository.Saved(child));
        });
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    private MockHttpServletRequestBuilder asApp(MockHttpServletRequestBuilder request) {
        return request
                .header("Authorization", "Bearer " + TestTokens.accessToken(jwtConfig, USER))
                .header("X-Client-Platform", "ios")
                .header("X-Client-Version", "1.4.0")
                .header("X-Device-ID", "device-1234");
    }

    private MockHttpServletRequestBuilder putChild(String childId, String body) {
        return asApp(put("/api/children/" + childId)).contentType(MediaType.APPLICATION_JSON).content(body);
    }

    private static final String FULL = """
            {"nickname":"Freya","avatarType":"girl","avatarId":"owl","ageBucket":"2-4","language":"pl","textSizeScale":1.2,
             "favorites":{"stories":["snowy-day"],"activities":["bubbles"],"songs":["twinkle"]},
             "storyProgress":{"snowy-day":{"pageIndex":3,"totalPages":12,"finishedCount":2}},
             "finishedStoryIds":["snowy-day"],"challengeCounts":{"music":4,"jigsaw":1,"reading":0},
             "achievements":["first-story"],
             "settings":{"screenTimeEnabled":true,"smartRemindersEnabled":false,
               "customReminders":[{"id":"r1","title":"Bath; then story","message":"Teeth & pyjamas <3","dayOfWeek":1,"time":"19:00","isActive":true}]},
             "version":0}
            """;

    private Child savedChild() {
        ArgumentCaptor<Child> captor = ArgumentCaptor.forClass(Child.class);
        verify(childRepository).putIfVersion(eq(USER), captor.capture(), anyLong());
        return captor.getValue();
    }

    @Test
    void createsAChildWithEveryFieldTheAppSends() throws Exception {
        mockMvc.perform(putChild("main", FULL))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.version").value(1))
                .andExpect(jsonPath("$.childId").value("main"))
                .andExpect(jsonPath("$.storyProgress.snowy-day.finishedCount").value(2))
                .andExpect(jsonPath("$.settings.customReminders[0].title").value("Bath; then story"))
                .andExpect(jsonPath("$.settings.customReminders[0].isActive").value(true));

        Child saved = savedChild();
        assertEquals("Freya", saved.getNickname());
        assertEquals(List.of("snowy-day"), saved.getFinishedStoryIds());
        assertEquals(4L, saved.getChallengeCounts().get("music"));
        verify(childRepository).putIfVersion(eq(USER), any(), eq(0L));
    }

    @Test
    void neverSendsTheServerWriteTimeBack() throws Exception {
        mockMvc.perform(putChild("main", FULL)).andExpect(jsonPath("$.updatedAt").doesNotExist());
    }

    @Test
    void refusesAStaleWriteWith409AndTheCurrentDocument() throws Exception {
        Child current = new Child();
        current.setChildId("main");
        current.setNickname("Newer");
        current.setVersion(5);
        when(childRepository.putIfVersion(eq(USER), any(), eq(3L)))
                .thenReturn(CompletableFuture.completedFuture(new ChildRepository.Conflict(current)));

        mockMvc.perform(putChild("main", FULL.replace("\"version\":0", "\"version\":3")))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.errorCode").value("GTW-414"))
                .andExpect(jsonPath("$.details.current.nickname").value("Newer"))
                .andExpect(jsonPath("$.details.current.version").value(5));
    }

    @Test
    void refusesAnEleventhChild() throws Exception {
        when(childRepository.putIfVersion(eq(USER), any(), eq(0L)))
                .thenReturn(CompletableFuture.completedFuture(new ChildRepository.LimitReached(10)));

        mockMvc.perform(putChild("eleventh", FULL))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.errorCode").value("GTW-415"));
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "\"nickname\":\"Freya\"|\"nickname\":\"\"",
            "\"nickname\":\"Freya\"|\"nickname\":\"   \"",
            "\"nickname\":\"Freya\"|\"nickname\":\"aaaaaaaaaaaaaaaaaaaaa\"",
            "\"avatarType\":\"girl\"|\"avatarType\":\"dragon\"",
            "\"ageBucket\":\"2-4\"|\"ageBucket\":\"7-9\"",
            "\"language\":\"pl\"|\"language\":\"xx\"",
            "\"textSizeScale\":1.2|\"textSizeScale\":3.5",
            "\"pageIndex\":3|\"pageIndex\":-1",
            "\"music\":4|\"piano\":4",
            "\"dayOfWeek\":1|\"dayOfWeek\":7",
            "\"time\":\"19:00\"|\"time\":\"25:00\"",
            "\"version\":0|\"version\":-1",
            "\"version\":0|\"version\":null",
            "\"snowy-day\"]|\"../etc\"]"
    })
    void refusesAnInvalidFieldWith400(String swap) throws Exception {
        String[] parts = swap.split("\\|");

        mockMvc.perform(putChild("main", FULL.replaceFirst(java.util.regex.Pattern.quote(parts[0]), java.util.regex.Matcher.quoteReplacement(parts[1]))))
                .andExpect(status().isBadRequest());

        verify(childRepository, never()).putIfVersion(anyString(), any(), anyLong());
    }

    @Test
    void acceptsANicknameOfExactlyTwentyCharacters() throws Exception {
        mockMvc.perform(putChild("main", FULL.replace("\"Freya\"", "\"" + "a".repeat(20) + "\""))).andExpect(status().isOk());
    }

    @Test
    void refusesMoreThanFiftyReminders() throws Exception {
        String reminder = "{\"id\":\"r%d\",\"title\":\"t\",\"message\":\"m\",\"dayOfWeek\":1,\"time\":\"19:00\",\"isActive\":true}";
        StringBuilder many = new StringBuilder();
        for (int i = 0; i < 51; i++) {
            many.append(i == 0 ? "" : ",").append(reminder.formatted(i));
        }
        String body = FULL.replaceFirst("\"customReminders\":\\[.*?\\]\\}", "\"customReminders\":[" + many + "]}");

        mockMvc.perform(putChild("main", body)).andExpect(status().isBadRequest());
    }

    @ParameterizedTest
    @ValueSource(strings = {"UPPER", "has_underscore", "-leading", "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"})
    void refusesABadChildId(String childId) throws Exception {
        mockMvc.perform(putChild(childId, FULL)).andExpect(status().isBadRequest());
    }

    @Test
    void acceptsAMinimalChildFromAnOlderApp() throws Exception {
        mockMvc.perform(putChild("main", "{\"nickname\":\"Freya\",\"version\":0,\"futureField\":true}")).andExpect(status().isOk());
    }

    @Test
    void readsOneChild() throws Exception {
        Child child = new Child();
        child.setChildId("main");
        child.setNickname("Freya");
        child.setVersion(2);
        when(childRepository.find(USER, "main")).thenReturn(CompletableFuture.completedFuture(Optional.of(child)));

        mockMvc.perform(asApp(get("/api/children/main")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.nickname").value("Freya"))
                .andExpect(jsonPath("$.version").value(2));
    }

    @Test
    void answers404ForAChildThatDoesNotExist() throws Exception {
        when(childRepository.find(USER, "ghost")).thenReturn(CompletableFuture.completedFuture(Optional.empty()));

        mockMvc.perform(asApp(get("/api/children/ghost"))).andExpect(status().isNotFound());
    }

    @Test
    void listsTheFamilysChildren() throws Exception {
        Child child = new Child();
        child.setChildId("main");
        child.setNickname("Freya");
        when(childRepository.findAll(USER)).thenReturn(CompletableFuture.completedFuture(List.of(child)));

        mockMvc.perform(asApp(get("/api/children")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.children[0].childId").value("main"));
    }

    @Test
    void offersAnUnsavedChildBuiltFromTheOldProfileWhenThereAreNoChildren() throws Exception {
        UserProfile profile = new UserProfile(USER);
        profile.setNickname("Freya");
        profile.setAvatarType("girl");
        profile.setAvatarId("owl");
        profile.setNotifications(new java.util.HashMap<>(Map.of("screenTimeEnabled", true, "smartRemindersEnabled", false)));
        profile.setSchedule(new java.util.HashMap<>(Map.of("childAgeRange", "18-24m",
                "customReminders", List.of(Map.of("id", "r1", "title", "Bath", "message", "", "dayOfWeek", 1, "time", "19:00", "isActive", true)))));
        when(userProfileRepository.findByUserId(USER)).thenReturn(CompletableFuture.completedFuture(Optional.of(profile)));

        mockMvc.perform(asApp(get("/api/children")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.children[0].childId").value("default"))
                .andExpect(jsonPath("$.children[0].version").value(0))
                .andExpect(jsonPath("$.children[0].nickname").value("Freya"))
                .andExpect(jsonPath("$.children[0].ageBucket").value("0-2"))
                .andExpect(jsonPath("$.children[0].settings.screenTimeEnabled").value(true))
                .andExpect(jsonPath("$.children[0].settings.customReminders[0].title").value("Bath"));

        verify(childRepository, never()).putIfVersion(anyString(), any(), anyLong());
    }

    @Test
    void skipsAnOldReminderThatWouldNotPassValidation() throws Exception {
        UserProfile profile = new UserProfile(USER);
        profile.setNickname("Freya");
        profile.setSchedule(new java.util.HashMap<>(Map.of("customReminders", List.of(
                Map.of("id", "r1", "title", "Bath", "dayOfWeek", 1, "time", "19:00", "isActive", true),
                Map.of("id", "r2", "title", "Bad time", "dayOfWeek", 2, "time", "nope", "isActive", true),
                Map.of("id", "r3", "title", "Bad day", "dayOfWeek", 9, "time", "19:00", "isActive", true)))));
        when(userProfileRepository.findByUserId(USER)).thenReturn(CompletableFuture.completedFuture(Optional.of(profile)));

        mockMvc.perform(asApp(get("/api/children")))
                .andExpect(jsonPath("$.children[0].settings.customReminders.length()").value(1));
    }

    @Test
    void listsNoChildrenForAFamilyWithNoProfileEither() throws Exception {
        mockMvc.perform(asApp(get("/api/children")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.children.length()").value(0));
    }

    @Test
    void refusesWithoutAToken() throws Exception {
        mockMvc.perform(get("/api/children")).andExpect(status().isUnauthorized());
    }

    @Test
    void writesOnlyUnderTheSignedInFamily() throws Exception {
        mockMvc.perform(putChild("main", FULL));

        verify(childRepository).putIfVersion(eq(USER), any(), anyLong());
        verify(childRepository, never()).putIfVersion(org.mockito.ArgumentMatchers.argThat(id -> !USER.equals(id)), any(), anyLong());
    }

    @Test
    void neverStoresAnUpdatedAtTheAppSent() throws Exception {
        mockMvc.perform(putChild("main", FULL.replace("\"version\":0", "\"version\":0,\"updatedAt\":\"2020-01-01\"")));

        assertNull(savedChild().getUpdatedAt());
    }
}
