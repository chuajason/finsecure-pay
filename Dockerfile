# syntax=docker/dockerfile:1
# Stage 1: build with Maven. Tests run in the pipeline, so the image build skips them.
FROM maven:3.9.9-eclipse-temurin-21 AS build
WORKDIR /workspace
COPY pom.xml .
RUN mvn -B -q dependency:go-offline
COPY src ./src
RUN mvn -B -q -DskipTests package \
 && java -Djarmode=tools -jar target/finsecure-pay.jar extract --layers --launcher --destination target/extracted

# Stage 2: minimal runtime. JRE only, non-root user, layered copy so dependency
# layers are cached and only the application layer changes between builds.
FROM eclipse-temurin:21-jre-alpine
ARG APP_VERSION=dev
ENV APP_VERSION=${APP_VERSION} \
    JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=75 -XX:+UseSerialGC"
RUN apk upgrade --no-cache \
 && addgroup -S -g 10001 app && adduser -S -u 10001 -G app app \
 && apk add --no-cache curl
WORKDIR /app
COPY --from=build /workspace/target/extracted/dependencies/ ./
COPY --from=build /workspace/target/extracted/spring-boot-loader/ ./
COPY --from=build /workspace/target/extracted/snapshot-dependencies/ ./
COPY --from=build /workspace/target/extracted/application/ ./
USER 10001:10001
EXPOSE 8080
HEALTHCHECK --interval=15s --timeout=3s --start-period=30s --retries=3 \
  CMD curl -fsS http://localhost:8080/actuator/health/liveness || exit 1
LABEL org.opencontainers.image.title="finsecure-pay" \
      org.opencontainers.image.version="${APP_VERSION}" \
      org.opencontainers.image.source="https://github.com/chuajason/finsecure-pay"
ENTRYPOINT ["java", "org.springframework.boot.loader.launch.JarLauncher"]
