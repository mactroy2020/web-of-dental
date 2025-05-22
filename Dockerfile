FROM nginx:alpine

# Copy the static files from src directory to nginx's default html directory
COPY src/ /usr/share/nginx/html/

# Expose port 80
EXPOSE 80

# The default nginx command will start the server 