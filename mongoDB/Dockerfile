# set up the container.
FROM mongo:7.0-jammy

# set utf-8 encoding and the root user's password.
ENV LANG=ja_JP.UTF-8
ENV MONGO_INITDB_ROOT_USERNAME=root
ENV MONGO_INITDB_ROOT_PASSWORD=password

# copy the init js file to the init dir.
COPY mongo_db.js /docker-entrypoint-initdb.d/

# expose the port.
EXPOSE 27017
