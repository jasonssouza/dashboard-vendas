FROM nginx:alpine

COPY dashboard_vendas.html /usr/share/nginx/html/index.html

EXPOSE 80
