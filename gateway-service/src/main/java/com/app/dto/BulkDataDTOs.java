package com.app.dto;

import com.app.model.Story;
import com.fasterxml.jackson.annotation.JsonInclude;

import java.time.Instant;
import java.util.List;
import java.util.Map;

/**
 * DTOs for bulk data operations
 */
public class BulkDataDTOs {
    
    /**
     * Request DTO for bulk data polling
     */
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public static class BulkDataRequest {
        private String lastSyncTimestamp; // ISO 8601 timestamp
        private List<String> dataTypes; // e.g., ["stories", "users", "analytics"]
        private Integer limit; // Max items per data type
        private String cursor; // For pagination
        private Map<String, Object> filters; // Additional filters
        private boolean includeDeleted; // Include soft-deleted items
        private String version; // API version for compatibility
        
        // Constructors
        public BulkDataRequest() {}
        
        public BulkDataRequest(String lastSyncTimestamp, List<String> dataTypes) {
            this.lastSyncTimestamp = lastSyncTimestamp;
            this.dataTypes = dataTypes;
        }
        
        // Getters and Setters
        public String getLastSyncTimestamp() {
            return lastSyncTimestamp;
        }
        
        public void setLastSyncTimestamp(String lastSyncTimestamp) {
            this.lastSyncTimestamp = lastSyncTimestamp;
        }
        
        public List<String> getDataTypes() {
            return dataTypes;
        }
        
        public void setDataTypes(List<String> dataTypes) {
            this.dataTypes = dataTypes;
        }
        
        public Integer getLimit() {
            return limit;
        }
        
        public void setLimit(Integer limit) {
            this.limit = limit;
        }
        
        public String getCursor() {
            return cursor;
        }
        
        public void setCursor(String cursor) {
            this.cursor = cursor;
        }
        
        public Map<String, Object> getFilters() {
            return filters;
        }
        
        public void setFilters(Map<String, Object> filters) {
            this.filters = filters;
        }
        
        public boolean isIncludeDeleted() {
            return includeDeleted;
        }
        
        public void setIncludeDeleted(boolean includeDeleted) {
            this.includeDeleted = includeDeleted;
        }
        
        public String getVersion() {
            return version;
        }
        
        public void setVersion(String version) {
            this.version = version;
        }
    }
    
    /**
     * Response DTO for bulk data polling
     */
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public static class BulkDataResponse {
        private String syncTimestamp; // Current sync timestamp
        private Map<String, DataTypeResponse> data; // Data organized by type
        private PaginationInfo pagination;
        private SyncMetadata metadata;
        private boolean hasMore; // More data available
        private String nextCursor; // Cursor for next page
        
        // Constructors
        public BulkDataResponse() {
            this.syncTimestamp = Instant.now().toString();
        }
        
        // Getters and Setters
        public String getSyncTimestamp() {
            return syncTimestamp;
        }
        
        public void setSyncTimestamp(String syncTimestamp) {
            this.syncTimestamp = syncTimestamp;
        }
        
        public Map<String, DataTypeResponse> getData() {
            return data;
        }
        
        public void setData(Map<String, DataTypeResponse> data) {
            this.data = data;
        }
        
        public PaginationInfo getPagination() {
            return pagination;
        }
        
        public void setPagination(PaginationInfo pagination) {
            this.pagination = pagination;
        }
        
        public SyncMetadata getMetadata() {
            return metadata;
        }
        
        public void setMetadata(SyncMetadata metadata) {
            this.metadata = metadata;
        }
        
        public boolean isHasMore() {
            return hasMore;
        }
        
        public void setHasMore(boolean hasMore) {
            this.hasMore = hasMore;
        }
        
        public String getNextCursor() {
            return nextCursor;
        }
        
        public void setNextCursor(String nextCursor) {
            this.nextCursor = nextCursor;
        }
    }
    
    /**
     * Data type specific response
     */
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public static class DataTypeResponse {
        private String dataType;
        private List<Object> items;
        private Integer totalCount;
        private Integer newCount;
        private Integer updatedCount;
        private Integer deletedCount;
        private String lastModified;
        private Map<String, Object> summary; // Summary statistics
        
        // Constructors
        public DataTypeResponse() {}
        
        public DataTypeResponse(String dataType, List<Object> items) {
            this.dataType = dataType;
            this.items = items;
        }
        
        // Getters and Setters
        public String getDataType() {
            return dataType;
        }
        
        public void setDataType(String dataType) {
            this.dataType = dataType;
        }
        
        public List<Object> getItems() {
            return items;
        }
        
        public void setItems(List<Object> items) {
            this.items = items;
        }
        
        public Integer getTotalCount() {
            return totalCount;
        }
        
        public void setTotalCount(Integer totalCount) {
            this.totalCount = totalCount;
        }
        
        public Integer getNewCount() {
            return newCount;
        }
        
        public void setNewCount(Integer newCount) {
            this.newCount = newCount;
        }
        
        public Integer getUpdatedCount() {
            return updatedCount;
        }
        
        public void setUpdatedCount(Integer updatedCount) {
            this.updatedCount = updatedCount;
        }
        
        public Integer getDeletedCount() {
            return deletedCount;
        }
        
        public void setDeletedCount(Integer deletedCount) {
            this.deletedCount = deletedCount;
        }
        
        public String getLastModified() {
            return lastModified;
        }
        
        public void setLastModified(String lastModified) {
            this.lastModified = lastModified;
        }
        
        public Map<String, Object> getSummary() {
            return summary;
        }
        
        public void setSummary(Map<String, Object> summary) {
            this.summary = summary;
        }
    }
    
    /**
     * Pagination information
     */
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public static class PaginationInfo {
        private Integer page;
        private Integer pageSize;
        private Integer totalPages;
        private Long totalItems;
        private boolean hasNext;
        private boolean hasPrevious;
        
        // Constructors
        public PaginationInfo() {}
        
        public PaginationInfo(Integer page, Integer pageSize, Long totalItems) {
            this.page = page;
            this.pageSize = pageSize;
            this.totalItems = totalItems;
            this.totalPages = (int) Math.ceil((double) totalItems / pageSize);
            this.hasNext = page < totalPages;
            this.hasPrevious = page > 1;
        }
        
        // Getters and Setters
        public Integer getPage() {
            return page;
        }
        
        public void setPage(Integer page) {
            this.page = page;
        }
        
        public Integer getPageSize() {
            return pageSize;
        }
        
        public void setPageSize(Integer pageSize) {
            this.pageSize = pageSize;
        }
        
        public Integer getTotalPages() {
            return totalPages;
        }
        
        public void setTotalPages(Integer totalPages) {
            this.totalPages = totalPages;
        }
        
        public Long getTotalItems() {
            return totalItems;
        }
        
        public void setTotalItems(Long totalItems) {
            this.totalItems = totalItems;
        }
        
        public boolean isHasNext() {
            return hasNext;
        }
        
        public void setHasNext(boolean hasNext) {
            this.hasNext = hasNext;
        }
        
        public boolean isHasPrevious() {
            return hasPrevious;
        }
        
        public void setHasPrevious(boolean hasPrevious) {
            this.hasPrevious = hasPrevious;
        }
    }

    /**
     * Sync metadata information
     */
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public static class SyncMetadata {
        private String serverVersion;
        private Long processingTimeMs;
        private Integer compressionRatio; // Percentage
        private String checksumMd5;
        private Map<String, Object> serverInfo;
        private List<String> warnings;
        private List<String> errors;

        // Constructors
        public SyncMetadata() {}

        // Getters and Setters
        public String getServerVersion() {
            return serverVersion;
        }

        public void setServerVersion(String serverVersion) {
            this.serverVersion = serverVersion;
        }

        public Long getProcessingTimeMs() {
            return processingTimeMs;
        }

        public void setProcessingTimeMs(Long processingTimeMs) {
            this.processingTimeMs = processingTimeMs;
        }

        public Integer getCompressionRatio() {
            return compressionRatio;
        }

        public void setCompressionRatio(Integer compressionRatio) {
            this.compressionRatio = compressionRatio;
        }

        public String getChecksumMd5() {
            return checksumMd5;
        }

        public void setChecksumMd5(String checksumMd5) {
            this.checksumMd5 = checksumMd5;
        }

        public Map<String, Object> getServerInfo() {
            return serverInfo;
        }

        public void setServerInfo(Map<String, Object> serverInfo) {
            this.serverInfo = serverInfo;
        }

        public List<String> getWarnings() {
            return warnings;
        }

        public void setWarnings(List<String> warnings) {
            this.warnings = warnings;
        }

        public List<String> getErrors() {
            return errors;
        }

        public void setErrors(List<String> errors) {
            this.errors = errors;
        }
    }

    /**
     * Story summary DTO for bulk responses
     */
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public static class StorySummary {
        private String id;
        private String title;
        private String category;
        private boolean isAvailable;
        private String version;
        private String lastModified;
        private Long downloadCount;
        private Double rating;

        // Constructors
        public StorySummary() {}

        public StorySummary(Story story) {
            this.id = story.getId();
            this.title = story.getTitle();
            this.category = story.getCategory();
            this.isAvailable = story.isAvailable();
            this.version = story.getVersion();
            this.lastModified = story.getUpdatedAt() != null ? story.getUpdatedAt().toString() : null;
            this.downloadCount = story.getDownloadCount();
            this.rating = story.getRating();
        }

        // Getters and Setters
        public String getId() {
            return id;
        }

        public void setId(String id) {
            this.id = id;
        }

        public String getTitle() {
            return title;
        }

        public void setTitle(String title) {
            this.title = title;
        }

        public String getCategory() {
            return category;
        }

        public void setCategory(String category) {
            this.category = category;
        }

        public boolean isAvailable() {
            return isAvailable;
        }

        public void setAvailable(boolean available) {
            isAvailable = available;
        }

        public String getVersion() {
            return version;
        }

        public void setVersion(String version) {
            this.version = version;
        }

        public String getLastModified() {
            return lastModified;
        }

        public void setLastModified(String lastModified) {
            this.lastModified = lastModified;
        }

        public Long getDownloadCount() {
            return downloadCount;
        }

        public void setDownloadCount(Long downloadCount) {
            this.downloadCount = downloadCount;
        }

        public Double getRating() {
            return rating;
        }

        public void setRating(Double rating) {
            this.rating = rating;
        }
    }
}
