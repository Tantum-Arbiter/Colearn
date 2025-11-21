FROM nginx:alpine

# Copy website files to nginx html directory
COPY grow-with-freya-website/index.html /usr/share/nginx/html/
COPY grow-with-freya-website/styles.css /usr/share/nginx/html/
COPY grow-with-freya-website/script.js /usr/share/nginx/html/
COPY grow-with-freya-website/logo.png /usr/share/nginx/html/

# Expose port 80
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]

