# Firestore Indexes Configuration

This document explains the Firestore indexes configuration for the Grow with Freya gateway service.

## Overview

Firebase Firestore requires indexes for efficient querying. This configuration defines all necessary indexes for the application's query patterns.

## Index Categories

### 1. User Collection Indexes

#### Single Field Indexes
- **email**: For user lookup by email address
- **isActive**: For filtering active users
- **createdAt**: For time-based user queries

#### Composite Indexes
- **provider + providerId**: For OAuth provider-based user lookup
- **isActive + createdAt**: For active users created after a timestamp

### 2. Sessions Collection Indexes

#### Single Field Indexes
- **refreshToken**: For session lookup by refresh token
- **userId**: For finding all sessions for a user
- **isActive**: For filtering active sessions
- **expiresAt**: For finding expired sessions

#### Composite Indexes
- **userId + isActive**: For finding active sessions for a specific user
- **isActive + expiresAt**: For finding sessions expiring soon

### 3. Stories Collection Indexes

#### Single Field Indexes
- **category**: For filtering stories by category
- **isAvailable**: For filtering available stories
- **ageRange**: For filtering stories by age range
- **createdAt**: For sorting by creation date
- **updatedAt**: For sorting by last update
- **rating**: For sorting by rating
- **downloadCount**: For sorting by popularity

#### Composite Indexes
- **category + isAvailable**: For available stories in a category
- **category + ageRange**: For stories in category for specific age
- **isAvailable + ageRange**: For available stories for specific age
- **category + isAvailable + ageRange**: For complex filtering

## Query Patterns Supported

### User Queries
```java
// Single field queries
firestore.collection("users").whereEqualTo("email", email)
firestore.collection("users").whereEqualTo("isActive", true)
firestore.collection("users").whereGreaterThan("createdAt", timestamp)

// Composite queries
firestore.collection("users")
    .whereEqualTo("provider", "google")
    .whereEqualTo("providerId", "123456")
```

### Session Queries
```java
// Single field queries
firestore.collection("sessions").whereEqualTo("refreshToken", token)
firestore.collection("sessions").whereEqualTo("userId", userId)

// Composite queries
firestore.collection("sessions")
    .whereEqualTo("userId", userId)
    .whereEqualTo("isActive", true)

firestore.collection("sessions")
    .whereEqualTo("isActive", true)
    .whereLessThanOrEqualTo("expiresAt", threshold)
```

### Story Queries
```java
// Single field queries
firestore.collection("stories").whereEqualTo("category", "bedtime")
firestore.collection("stories").whereEqualTo("isAvailable", true)
firestore.collection("stories").orderBy("rating", Query.Direction.DESCENDING)

// Composite queries
firestore.collection("stories")
    .whereEqualTo("category", "bedtime")
    .whereEqualTo("isAvailable", true)
    .whereEqualTo("ageRange", "2-5")
```

## Deployment

### Prerequisites
1. Firebase CLI installed: `npm install -g firebase-tools`
2. Firebase authentication: `firebase login`
3. Environment variable set: `export FIREBASE_PROJECT_ID=your-project-id`

### Deploy Indexes and Rules
```bash
cd gateway-service
./deploy-firestore-config.sh
```

### Dry Run (Preview Changes)
```bash
cd gateway-service
./deploy-firestore-config.sh --dry-run
```

## Index Building Process

After deployment:
1. Indexes will appear in Firebase Console as "Building"
2. Simple indexes build quickly (seconds to minutes)
3. Composite indexes may take longer depending on data size
4. Monitor progress in Firebase Console > Firestore > Indexes

## Performance Considerations

### Index Selection Strategy
- **Equality filters first**: Most selective filters should come first
- **Range filters last**: Only one range filter per query
- **Order by**: Must match the last field in composite indexes

### Query Optimization Tips
1. **Use limits**: Always add `.limit()` to prevent large result sets
2. **Pagination**: Use cursor-based pagination for large datasets
3. **Field selection**: Only select fields you need
4. **Caching**: Implement client-side caching for frequently accessed data

## Security Rules Integration

The `firestore.rules` file works with indexes to provide:
- **Authentication checks**: Ensure users can only access their data
- **Data validation**: Validate field types and required fields
- **Access control**: Prevent unauthorized reads/writes

## Monitoring and Maintenance

### Index Usage Monitoring
1. Firebase Console > Firestore > Usage tab
2. Monitor query performance and costs
3. Identify unused indexes for cleanup

### Index Maintenance
- **Add indexes**: When adding new query patterns
- **Remove indexes**: When queries are no longer used
- **Update indexes**: When query patterns change

## Troubleshooting

### Common Issues

#### "Missing Index" Error
```
The query requires an index. You can create it here: [link]
```
**Solution**: Add the suggested index to `firestore.indexes.json` and redeploy

#### "Query Timeout" Error
```
Query timed out
```
**Solution**: 
1. Check if appropriate indexes exist
2. Add query limits
3. Optimize query structure

#### "Permission Denied" Error
```
Missing or insufficient permissions
```
**Solution**: Check `firestore.rules` for proper access controls

### Debug Commands
```bash
# Check current indexes
firebase firestore:indexes --project=your-project-id

# Validate rules
firebase firestore:rules --project=your-project-id

# Test rules locally
firebase emulators:start --only firestore
```

## Cost Optimization

### Index Cost Factors
- **Number of fields**: More fields = higher cost
- **Document writes**: Each write updates all relevant indexes
- **Query complexity**: Complex queries use more resources

### Cost Reduction Strategies
1. **Minimize composite indexes**: Only create what you need
2. **Use single-field indexes**: When possible, prefer single-field queries
3. **Implement pagination**: Reduce result set sizes
4. **Cache frequently accessed data**: Reduce query frequency

## Future Considerations

### Planned Enhancements
- **Full-text search**: Consider Algolia integration for story search
- **Geolocation**: Add location-based indexes if needed
- **Analytics**: Add indexes for usage analytics queries
- **Recommendations**: Add indexes for recommendation algorithms

### Scaling Considerations
- **Collection groups**: Consider when data grows large
- **Sharding**: For high-write scenarios
- **Read replicas**: For global distribution

## Integration with Application

### Repository Query Mapping

The indexes directly support these repository methods:

#### UserRepository
- `findByEmail(String email)` → Uses `email` index
- `findByProviderAndProviderId(String provider, String providerId)` → Uses `provider + providerId` composite index
- `findAllActive()` → Uses `isActive` index
- `findUsersCreatedAfter(long timestamp)` → Uses `createdAt` index
- `countActiveUsers()` → Uses `isActive` index

#### UserSessionRepository
- `findByRefreshToken(String refreshToken)` → Uses `refreshToken` index
- `findActiveSessionsByUserId(String userId)` → Uses `userId + isActive` composite index
- `findAllSessionsByUserId(String userId)` → Uses `userId` index
- `countActiveSessions()` → Uses `isActive` index
- `findSessionsExpiringWithin(int withinMinutes)` → Uses `isActive + expiresAt` composite index

#### StoryRepository (Future)
- `findByCategory(String category)` → Uses `category` index
- `findAvailableStories()` → Uses `isAvailable` index
- `findStoriesByAgeRange(String ageRange)` → Uses `ageRange` index
- Complex filtering → Uses various composite indexes

## Quick Start

1. **Deploy indexes and rules**:
   ```bash
   cd gateway-service
   export FIREBASE_PROJECT_ID=your-project-id
   ./deploy-firestore-config.sh
   ```

2. **Or use the integrated deployment**:
   ```bash
   cd gateway-service
   ./deploy-gcp.sh firestore
   ```

3. **Monitor index building** in Firebase Console

4. **Test your queries** to ensure they use the correct indexes
