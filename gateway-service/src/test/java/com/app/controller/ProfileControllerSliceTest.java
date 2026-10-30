package com.app.controller;

import com.app.config.JwtConfig;
import com.app.model.UserProfile;
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
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = ProfileController.class)
@SecuredWebMvcTest
class ProfileControllerSliceTest {

    private static final String USER = "user-42";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JwtConfig jwtConfig;

    @Autowired
    private RateLimitingFilter rateLimitingFilter;

    @MockitoBean
    private UserProfileRepository userProfileRepository;

    @BeforeEach
    void setUp() {
        rateLimitingFilter.resetForTests();
        when(userProfileRepository.findByUserId(USER)).thenReturn(CompletableFuture.completedFuture(Optional.empty()));
        when(userProfileRepository.save(any())).thenAnswer(inv -> CompletableFuture.completedFuture(inv.getArgument(0)));
        when(userProfileRepository.update(any())).thenAnswer(inv -> CompletableFuture.completedFuture(inv.getArgument(0)));
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

    private MockHttpServletRequestBuilder saveProfile(String body) {
        return asApp(post("/api/profile")).contentType(MediaType.APPLICATION_JSON).content(body);
    }

    private static String profileWithNickname(String nickname) {
        return "{\"nickname\":\"" + nickname + "\",\"avatarType\":\"girl\",\"avatarId\":\"owl\"}";
    }

    private UserProfile savedProfile() {
        ArgumentCaptor<UserProfile> captor = ArgumentCaptor.forClass(UserProfile.class);
        verify(userProfileRepository).save(captor.capture());
        return captor.getValue();
    }

    @Test
    void savesAReminderWithEverydayPunctuationExactlyAsTyped() throws Exception {
        String body = """
                {"nickname":"Freya","avatarType":"girl","avatarId":"owl",
                 "schedule":{"customReminders":[
                   {"title":"Bath; then story","message":"Teeth & pyjamas <3","time":"19:00"},
                   {"title":"Tom | Anna's turn","message":"#1 description: a script for bedtime","time":"19:30"}
                 ]}}
                """;

        mockMvc.perform(saveProfile(body)).andExpect(status().isCreated());

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> reminders = (List<Map<String, Object>>) savedProfile().getSchedule().get("customReminders");
        assertEquals("Bath; then story", reminders.get(0).get("title"));
        assertEquals("Teeth & pyjamas <3", reminders.get(0).get("message"));
        assertEquals("#1 description: a script for bedtime", reminders.get(1).get("message"));
    }

    @ParameterizedTest
    @ValueSource(strings = {"F", "Freya", "Zoë", "Łucja", "مريم", "Ana 🌙", "twentycharacters_ok"})
    void acceptsANicknameOfOneToTwentyCharacters(String nickname) throws Exception {
        mockMvc.perform(saveProfile(profileWithNickname(nickname)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.nickname").value(nickname));
    }

    @Test
    void acceptsANicknameOfExactlyTwentyCharacters() throws Exception {
        mockMvc.perform(saveProfile(profileWithNickname("a".repeat(20)))).andExpect(status().isCreated());
    }

    @Test
    void rejectsANicknameOfTwentyOneCharacters() throws Exception {
        mockMvc.perform(saveProfile(profileWithNickname("a".repeat(21))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("GTW-113"));

        verify(userProfileRepository, never()).save(any());
    }

    @ParameterizedTest
    @ValueSource(strings = {"", "   "})
    void rejectsABlankNickname(String nickname) throws Exception {
        mockMvc.perform(saveProfile(profileWithNickname(nickname))).andExpect(status().isBadRequest());
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "{\"avatarType\":\"girl\",\"avatarId\":\"owl\"}",
            "{\"nickname\":\"Freya\",\"avatarId\":\"owl\"}",
            "{\"nickname\":\"Freya\",\"avatarType\":\"dragon\",\"avatarId\":\"owl\"}",
            "{\"nickname\":\"Freya\",\"avatarType\":\"girl\",\"avatarId\":\" \"}"
    })
    void rejectsAProfileWithAMissingOrInvalidField(String body) throws Exception {
        mockMvc.perform(saveProfile(body)).andExpect(status().isBadRequest());

        verify(userProfileRepository, never()).save(any());
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "{\"nickname\":42,\"avatarType\":\"girl\",\"avatarId\":\"owl\"}",
            "{\"nickname\":\"Freya\",\"avatarType\":[\"girl\"],\"avatarId\":\"owl\"}",
            "{\"nickname\":\"Freya\",\"avatarType\":\"girl\",\"avatarId\":\"owl\",\"notifications\":\"on\"}",
            "{\"nickname\":\"Freya\",\"avatarType\":\"girl\",\"avatarId\":\"owl\",\"schedule\":[1,2]}"
    })
    void rejectsAFieldOfTheWrongTypeWith400(String body) throws Exception {
        mockMvc.perform(saveProfile(body)).andExpect(status().isBadRequest());

        verify(userProfileRepository, never()).save(any());
    }

    @ParameterizedTest
    @ValueSource(strings = {"{", "not json", "[]"})
    void rejectsMalformedJsonWith400(String body) throws Exception {
        mockMvc.perform(saveProfile(body)).andExpect(status().isBadRequest());
    }

    @Test
    void ignoresUnknownFieldsFromANewerApp() throws Exception {
        String body = "{\"nickname\":\"Freya\",\"avatarType\":\"girl\",\"avatarId\":\"owl\",\"futureField\":{\"a\":1}}";

        mockMvc.perform(saveProfile(body)).andExpect(status().isCreated());
    }

    @Test
    void updatesAnExistingProfileWithOnlyTheFieldsSent() throws Exception {
        UserProfile existing = new UserProfile(USER);
        existing.setNickname("Freya");
        existing.setAvatarType("girl");
        existing.setAvatarId("owl");
        when(userProfileRepository.findByUserId(USER)).thenReturn(CompletableFuture.completedFuture(Optional.of(existing)));

        mockMvc.perform(saveProfile("{\"avatarId\":\"fox\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.nickname").value("Freya"))
                .andExpect(jsonPath("$.avatarId").value("fox"));
    }

    @Test
    void refusesTheSaveWithoutClientHeaders() throws Exception {
        mockMvc.perform(post("/api/profile")
                        .header("Authorization", "Bearer " + TestTokens.accessToken(jwtConfig, USER))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(profileWithNickname("Freya")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.details.missingHeaders.length()").value(3));
    }

    @Test
    void refusesTheSaveWithoutAToken() throws Exception {
        mockMvc.perform(post("/api/profile").contentType(MediaType.APPLICATION_JSON).content(profileWithNickname("Freya")))
                .andExpect(status().isUnauthorized());

        verify(userProfileRepository, never()).save(any());
    }

    @Test
    void refusesATraversalInTheUrl() throws Exception {
        mockMvc.perform(asApp(get("/api/profile/..%2f..%2fetc%2fpasswd"))).andExpect(status().isBadRequest());
    }

    @Test
    void returns404WhenThereIsNoProfile() throws Exception {
        mockMvc.perform(asApp(get("/api/profile")))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.errorCode").value("GTW-411"));
    }

    @Test
    void returnsTheSignedInFamilysProfile() throws Exception {
        UserProfile existing = new UserProfile(USER);
        existing.setNickname("Freya");
        when(userProfileRepository.findByUserId(USER)).thenReturn(CompletableFuture.completedFuture(Optional.of(existing)));

        mockMvc.perform(asApp(get("/api/profile")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.nickname").value("Freya"));
    }

    @Test
    void readsOnlyTheProfileOfTheUserInTheToken() throws Exception {
        mockMvc.perform(asApp(get("/api/profile")));

        verify(userProfileRepository).findByUserId(USER);
        verify(userProfileRepository, never()).findByUserId(org.mockito.ArgumentMatchers.argThat(id -> !USER.equals(id)));
    }

    @Test
    void returns500WhenTheDatabaseFailsOnRead() throws Exception {
        when(userProfileRepository.findByUserId(anyString()))
                .thenReturn(CompletableFuture.failedFuture(new RuntimeException("firestore unavailable")));

        mockMvc.perform(asApp(get("/api/profile")))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.errorCode").value("GTW-501"));
    }

    @Test
    void deletesTheProfile() throws Exception {
        UserProfile existing = new UserProfile(USER);
        when(userProfileRepository.findByUserId(USER)).thenReturn(CompletableFuture.completedFuture(Optional.of(existing)));
        when(userProfileRepository.delete(USER)).thenReturn(CompletableFuture.completedFuture(null));

        mockMvc.perform(asApp(delete("/api/profile"))).andExpect(status().isNoContent());

        verify(userProfileRepository).delete(USER);
    }

    @Test
    void returns404WhenDeletingAProfileThatDoesNotExist() throws Exception {
        mockMvc.perform(asApp(delete("/api/profile"))).andExpect(status().isNotFound());

        verify(userProfileRepository, never()).delete(anyString());
    }
}
