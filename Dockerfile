FROM node:latest

WORKDIR /home/choreouser

EXPOSE 8080

COPY files/* /home/choreouser/

ENV PM2_HOME=/tmp

RUN apt-get update &&\
    apt install --only-upgrade linux-libc-dev &&\
    apt-get install -y iproute2 vim netcat-openbsd &&\
    npm install -r package.json &&\
    npm install -g pm2 &&\
    addgroup --gid 10006 choreo &&\
    adduser --disabled-password  --no-create-home --uid 10006 --ingroup choreo choreouser &&\
    usermod -aG sudo choreouser &&\
    chmod +x app.js package.json server

CMD [ "node", "app.js" ]

USER 10006
