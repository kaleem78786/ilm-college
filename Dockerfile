# Multi-stage lightweight Nginx container for ILM College
FROM nginx:1.27-alpine

# Remove default nginx static assets
RUN rm -rf /usr/share/nginx/html/*

# Copy website files to default nginx serve directory
COPY site/ /usr/share/nginx/html/

# Copy custom nginx configuration
COPY deploy/nginx-docker.conf /etc/nginx/conf.d/default.conf

# Security headers & file permissions
RUN chmod -R 755 /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
