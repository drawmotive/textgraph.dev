# Docker renderer

Run TextGraph on your own infrastructure. The published container accepts TextGraph over HTTP and returns PNG or SVG, using the same rendering engine as the SDK. No browser or .NET host installation is required. The published image targets Linux amd64.

<figure class="guide-figure">
  <img src="/home-images/docker.svg" alt="Your application sends TextGraph in an HTTP POST to your Docker renderer, which returns a PNG or SVG image." width="640" height="280">
  <figcaption>Your source, your container, your rendered image.</figcaption>
</figure>

## Start the container

```bash
docker run --rm --read-only --cap-drop=ALL --security-opt=no-new-privileges \
  -p 127.0.0.1:8080:8080 ghcr.io/drawmotive/textgraph-renderer:0.3.0
```

This binds the service to localhost. The image includes the exact public SDK, packaged fonts and their notices. The default container has one rendering Worker; scale Workers or containers according to available memory.

## Render a diagram

```bash
curl --fail-with-body http://localhost:8080/api/v1/render/png \
  -H 'Content-Type: application/json' \
  -d '{"source":"web -> api -> database"}' -o diagram.png

curl --fail-with-body http://localhost:8080/api/v1/render/svg \
  -H 'Content-Type: application/json' \
  -d '{"source":"web -> api -> database"}' -o diagram.svg
```

Both endpoints accept `source`, optional `padding`, and optional `language`, such as `zh-CN` or `ja`. PNG also accepts `scale` and `maxWidth`. Successful responses contain image bytes; invalid diagram source returns HTTP 422 with compiler diagnostics. `GET /health` reports Worker availability. Busy capacity returns HTTP 429 with `Retry-After`.

Sources and rendered images are neither persisted nor logged by the renderer. The API is anonymous; your deployment owns access control. The public `renderer-test.textgraph.dev` endpoint is a temporary image-verification environment, not a production service.

## Choose your integration

- [Full API, configuration and container instructions](https://github.com/drawmotive/textgraph-renderer#readme)
- [Published Docker images](https://github.com/orgs/drawmotive/packages/container/package/textgraph-renderer)
- [JavaScript SDK](/integrations/javascript) for rendering inside your browser, Worker or Node.js application.
- [DrawMotive editor](/editor/) for a visual canvas and editable documents.

Service code and public SDK code are MIT licensed, including commercial use and redistribution. Preserve their copyright and license notices, together with the accompanying font and dependency licenses.
