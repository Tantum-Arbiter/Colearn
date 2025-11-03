# 🔥 Firestore Setup for Dev Environment (colean-func)

## Quick Setup Guide

Your Firestore indexes and security rules are now configured for your development environment with project ID `colean-func`.

### 📋 What's Configured

#### **Indexes Created**
- **10 composite indexes** for complex queries
- **14 single-field indexes** for basic filtering and sorting
- **Optimized for your repository queries** (User, Session, Story collections)

#### **Security Rules**
- **Authentication required** for all collections
- **User data isolation** - users can only access their own data
- **Read-only stories** for authenticated users
- **Data validation** for required fields and types

### 🚀 Deploy to Firebase

#### **Prerequisites**
1. **Install Firebase CLI** (if not already installed):
   ```bash
   npm install -g firebase-tools
   ```

2. **Login to Firebase**:
   ```bash
   firebase login
   ```

3. **Verify project access**:
   ```bash
   firebase projects:list
   ```
   Make sure you can see `colean-func` in the list.

#### **Deploy Configuration**

**Option 1: Quick Deploy**
```bash
cd gateway-service
./deploy-firestore-config.sh
```

**Option 2: Preview Changes First**
```bash
cd gateway-service
./deploy-firestore-config.sh --dry-run
```

**Option 3: Manual Deploy**
```bash
cd gateway-service
firebase deploy --only firestore:indexes,firestore:rules --project=colean-func
```

### 🔍 Verify Deployment

1. **Check Firebase Console**:
   - Go to: https://console.firebase.google.com/project/colean-func
   - Navigate to Firestore > Indexes
   - Verify indexes are building/built

2. **Test with Emulator** (Optional):
   ```bash
   cd gateway-service
   firebase emulators:start --only firestore --project=colean-func
   ```
   - Emulator UI: http://localhost:4000
   - Firestore: http://localhost:8080

### 📊 Index Summary

#### **Users Collection**
| Query Pattern | Index Used |
|---------------|------------|
| `findByEmail(email)` | `email` single-field |
| `findByProviderAndProviderId(provider, providerId)` | `provider + providerId` composite |
| `findAllActive()` | `isActive` single-field |
| `findUsersCreatedAfter(timestamp)` | `createdAt` single-field |

#### **Sessions Collection**
| Query Pattern | Index Used |
|---------------|------------|
| `findByRefreshToken(token)` | `refreshToken` single-field |
| `findActiveSessionsByUserId(userId)` | `userId + isActive` composite |
| `findSessionsExpiringWithin(minutes)` | `isActive + expiresAt` composite |

#### **Stories Collection** (Future-Ready)
| Query Pattern | Index Used |
|---------------|------------|
| `findByCategory(category)` | `category` single-field |
| `findAvailableStories()` | `isAvailable` single-field |
| Complex filtering | Various composite indexes |

### 🔐 Security Rules Summary

#### **Users Collection** (`/users/{userId}`)
- ✅ Users can read/write their own documents
- ✅ Email format validation
- ✅ OAuth provider validation (google/apple)
- ❌ Cannot modify email, provider, or providerId after creation

#### **Sessions Collection** (`/sessions/{sessionId}`)
- ✅ Users can manage their own sessions
- ✅ Required fields validation
- ❌ Cannot access other users' sessions

#### **Stories Collection** (`/stories/{storyId}`)
- ✅ Read-only access for authenticated users
- ❌ No write access (admin/backend only)

### 🛠 Troubleshooting

#### **"Missing Index" Error**
If you see this error in your application:
```
The query requires an index. You can create it here: [link]
```
1. Click the provided link to create the index in Firebase Console
2. Or add the index to `firestore.indexes.json` and redeploy

#### **"Permission Denied" Error**
```
Missing or insufficient permissions
```
1. Check that the user is authenticated
2. Verify the security rules in `firestore.rules`
3. Ensure the user is accessing their own data

#### **Deployment Issues**
```bash
# Check Firebase authentication
firebase login

# Verify project access
firebase projects:list

# Check configuration files
python3 -m json.tool firestore.indexes.json
```

### 📈 Performance Tips

1. **Use query limits** to prevent large result sets:
   ```java
   query.limit(50)
   ```

2. **Implement pagination** for large datasets:
   ```java
   query.startAfter(lastDocument).limit(20)
   ```

3. **Monitor costs** in Firebase Console > Usage

4. **Cache frequently accessed data** in your application

### 🎯 Next Steps

1. **Deploy the configuration** to your `colean-func` project
2. **Test your application** to verify queries work correctly
3. **Monitor index usage** in Firebase Console
4. **Add new indexes** as you develop new features

### 📚 Files Reference

- `firestore.indexes.json` - Index definitions
- `firestore.rules` - Security rules
- `firebase.json` - Firebase project configuration
- `deploy-firestore-config.sh` - Deployment script

---

**🎉 Your dev environment is ready for high-performance Firestore queries!**

For questions or issues, check the comprehensive documentation in `FIRESTORE-INDEXES.md`.
