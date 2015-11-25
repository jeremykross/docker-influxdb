FROM library/ubuntu:14.04

MAINTAINER ContainerShip Developers <developers@containership.io>

# set influxdb version
ENV INFLUXDB_VERSION 0.9.5

# install dependencies
RUN apt-get update && apt-get install npm wget -y
RUN wget http://influxdb.s3.amazonaws.com/influxdb_${INFLUXDB_VERSION}_amd64.deb
RUN dpkg -i influxdb_${INFLUXDB_VERSION}_amd64.deb

# install npm & node
RUN npm install -g n
RUN n 0.10.38

# create /app and add files
WORKDIR /app
ADD . /app

# install dependencies
RUN npm install

# set user
USER influxdb

# execute run script in foreground
CMD node influxdb.js
