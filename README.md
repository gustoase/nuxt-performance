# @drozd/nuxt-performance
[![NPM version](https://img.shields.io/npm/v/@drozd/nuxt-performance.svg)](https://www.npmjs.com/package/@drozd/nuxt-performance)

1) Highload middleware for nuxt's SSR rendering.
2) Disables SSR in case of a rendering freeze during DDOS, or in case of errors, to try to render on the client.
3) Selectively enable SSR or SPA mode

## Setup
```npm install @drozd/nuxt-performance```

or

```yarn add @drozd/nuxt-performance```

then inside your `nuxt.config.js` add config:

```javascript
module.exports = {
  performance: {
    renderRouteTimeCallback: (route, ms) => {
      console.log(`time render route: ${route} ${ms} ms`);
    },
    isOnlySPA: (route, _context) => {
      return route === '/personal';
    },
    maxRenderTime: 50,
    maxAttemptSsr: 3, // number of attempts to draw SSR if rendering is slow
    excludeRoutes: /healthcheck/, // regexp exclude routes
    timeDisabledSsrWithRoute: 1000 * 60, // SSR shutdown time after several attempts
    clearSlowCounterIntervalTime: 1000 * 60 * 5, // total counter clear interval
    maxSlowCount: 5 // maximum number of slow requests
  }

  // ...
};
```

## License
MIT
