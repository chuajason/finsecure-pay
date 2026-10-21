# syntax=docker/dockerfile:1
# Stage 1: build with Maven. Tests run in the pipeline, so the image build skips them.
FROM maven:3.9.9-eclipse-temurin-21 AS build
WORKDIR /workspace
COPY pom.xml .
RUN mvn -B -q dependency:go-offline
COPY src ./src
RUN mvn -B -q -DskipTests package \
 && java -Djarmode=layertools -jar target/finsecure-pay.jar extract --destination target/extracted

# Stage 2: minimal runtime. JRE only, non-root user, layered copy so dependency
# layers are cached and only the application layer changes between builds.
FROM eclipse-temurin:21-jre-alpine
ARG APP_VERSION=dev
ENV APP_VERSION=${APP_VERSION} \
    JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=75 -XX:+UseSerialGC"
RUN addgroup -S app && adduser -S app -G app \
 && apk add --no-cache curl
WORKDIR /app
COPY --from=build /workspace/target/extracted/dependencies/ ./
COPY --from=build /workspace/target/extracted/spring-boot-loader/ ./
COPY --from=build /workspace/target/extracted/snapshot-dependencies/ ./
COPY --from=build /workspace/target/extracted/application/ ./
USER app
EXPOSE 8080
HEALTHCHECK --interval=15s --timeout=3s --start-period=30s --retries=3 \
  CMD curl -fsS http://localhost:8080/actuator/health/liveness || exit 1
LABEL org.opencontainers.image.title="finsecure-pay" \
      org.opencontainers.image.version="${APP_VERSION}" \
      org.opencontainers.image.source="https://github.com/chuajason/finsecure-pay"
ENTRYPOINT ["java", "org.springframework.boot.loader.launch.JarLauncher"]
