FROM oven/bun:1.2.10 AS base
WORKDIR /app

# install dependencies into temp directory
# this will cache them and speed up future builds
FROM base AS install
RUN mkdir -p /temp/dev
COPY package.json bun.lock /temp/dev/
RUN cd /temp/dev && bun install --frozen-lockfile && bun pm trust --all

# copy node_modules from temp directory
# then copy all project files into the image
FROM base AS release
COPY --from=install /temp/dev/node_modules node_modules
COPY . .

# run the app
USER bun
EXPOSE 3000/tcp
ENTRYPOINT [ "bun", "run", "index.ts" ]