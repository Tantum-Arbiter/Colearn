package com.app.service;

import com.app.model.User;
import com.app.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;

@Service
public class UserService {

    private static final Logger logger = LoggerFactory.getLogger(UserService.class);

    private final UserRepository userRepository;
    private final ApplicationMetricsService metricsService;

    @Autowired
    public UserService(UserRepository userRepository, ApplicationMetricsService metricsService) {
        this.userRepository = userRepository;
        this.metricsService = metricsService;
    }

    public CompletableFuture<User> createUser(String provider, String providerId) {
        logger.info("Creating new user with provider: {}", provider);

        return CompletableFuture.supplyAsync(() -> {
            try {
                Optional<User> existingUser = userRepository.findByProviderAndProviderId(provider, providerId).join();
                if (existingUser.isPresent()) {
                    logger.warn("User already exists with provider: {} and providerId: {}", provider, providerId);
                    throw new IllegalArgumentException("User already exists with this provider");
                }

                User user = new User();
                user.setId(UUID.randomUUID().toString());
                user.setProvider(provider);
                user.setProviderId(providerId);
                user.setActive(true);
                user.setCreatedAt(Instant.now());
                user.setUpdatedAt(Instant.now());
                user.updateLastLogin();

                User savedUser = userRepository.save(user).join();
                metricsService.recordUserCreated(provider);

                logger.info("User created successfully: {}", savedUser.getId());
                return savedUser;

            } catch (Exception e) {
                logger.error("Error creating user with provider: {}", provider, e);
                metricsService.recordUserCreationError(provider, e.getClass().getSimpleName());
                throw new RuntimeException("Failed to create user", e);
            }
        });
    }
    public CompletableFuture<Optional<User>> getUserById(String userId) {
        logger.debug("Getting user by ID: {}", userId);
        
        return userRepository.findById(userId)
                .thenApply(userOpt -> {
                    if (userOpt.isPresent()) {
                        metricsService.recordUserLookup("id", "found");
                    } else {
                        metricsService.recordUserLookup("id", "not_found");
                    }
                    return userOpt;
                });
    }
    public CompletableFuture<User> getOrCreateUser(String provider, String providerId) {
        logger.debug("Getting or creating user with provider: {}", provider);

        return userRepository.findByProviderAndProviderId(provider, providerId)
                .thenCompose(userOpt -> {
                    if (userOpt.isPresent()) {
                        User existingUser = userOpt.get();
                        existingUser.updateLastLogin();

                        return userRepository.save(existingUser)
                                .thenApply(savedUser -> {
                                    metricsService.recordUserLogin(provider, "existing");
                                    return savedUser;
                                });
                    } else {
                        return createUser(provider, providerId)
                                .thenApply(newUser -> {
                                    metricsService.recordUserLogin(provider, "new");
                                    return newUser;
                                });
                    }
                });
    }
    public CompletableFuture<User> deactivateUser(String userId) {
        logger.info("Deactivating user: {}", userId);
        
        return userRepository.deactivateUser(userId)
                .thenApply(user -> {
                    metricsService.recordUserDeactivated(userId);
                    return user;
                });
    }
    public CompletableFuture<List<User>> getAllActiveUsers() {
        logger.debug("Getting all active users");
        
        return userRepository.findAllActive()
                .thenApply(users -> {
                    metricsService.recordUserListQuery("active", users.size());
                    return users;
                });
    }
    public CompletableFuture<Long> countActiveUsers() {
        logger.debug("Counting active users");
        
        return userRepository.countActiveUsers();
    }
}
