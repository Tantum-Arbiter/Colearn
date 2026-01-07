#!/bin/bash

# Script to rename props files in CMS stories to include story ID prefix
# This prevents cache collisions when multiple stories have props with same names

CMS_STORIES_DIR="scripts/cms-stories"

echo "Renaming props files to include story ID prefix..."

for story_dir in "$CMS_STORIES_DIR"/*/; do
    story_id=$(basename "$story_dir")
    
    # Find all props directories for this story
    for props_dir in "$story_dir"*/props/; do
        if [ -d "$props_dir" ]; then
            echo "Processing: $props_dir"
            
            # Process each file in the props directory
            for file in "$props_dir"*.webp "$props_dir"*.png "$props_dir"*.jpg; do
                if [ -f "$file" ]; then
                    filename=$(basename "$file")
                    dir=$(dirname "$file")
                    
                    # Check if file already has story ID prefix
                    if [[ "$filename" == "$story_id"* ]]; then
                        echo "  Already prefixed: $filename"
                    else
                        new_filename="${story_id}-${filename}"
                        echo "  Renaming: $filename -> $new_filename"
                        mv "$file" "$dir/$new_filename"
                    fi
                fi
            done
        fi
    done
done

echo ""
echo "Done renaming props files."
echo ""
echo "Listing all props files after rename:"
find "$CMS_STORIES_DIR" -path "*/props/*" -type f -name "*.webp" | head -30

