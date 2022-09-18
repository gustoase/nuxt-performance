import { Module } from '@nuxt/types';

interface IConfig {
  renderRouteTimeCallback: (_route: string, _ms: number) => void;
  isOnlySPA: (route: string, context: any) => boolean;
  maxRenderTime: number; // кол-во допустимых мс для рендера
  maxAttemptSsr: number; // кол-во попыток отрисовать ССР если рендер медленный
  excludeRoutes: RegExp;
  timeDisabledSsrWithRoute: number; // на какое время выключаем сср для страницы
  clearSlowCounterIntervalTime: number; // интервал очистки общего счётчика
  maxSlowCount: number; // максимальное кол-во медленных запросов
}

type TCounter = {
  count: number, // кол-во медленных запросов
  endDisabledTimeSsr: number // конец времени бана
};

const counterSlowRenderMap = new Map<string, TCounter>();

// общее кол-во медленных запросов
let allSlowCounter = 0;
let intervalCounter: any = null;

/**
 * Отлупливает промис в заданное время по таймауту
 * @param route
 * @param timeoutMs
 * @param promise
 * @param failureMessage
 */
const promiseWithTimeout = <T>(
  route: string,
  timeoutMs: number,
  promise: () => Promise<T>,
  failureMessage?: string
) => {
  let timeoutHandle: NodeJS.Timeout;
  const timeoutPromise = new Promise<never>((_resolve, reject) => {
    timeoutHandle = setTimeout(() => {
      if (!counterSlowRenderMap.has(route)) {
        counterSlowRenderMap.set(route, {
          count: 0,
          endDisabledTimeSsr: 0
        });
      }

      // @ts-ignore
      counterSlowRenderMap.get(route).count++;
      allSlowCounter++;
      reject(new Error(failureMessage));
    }, timeoutMs);
  });

  return Promise.race([
    promise,
    timeoutPromise
  ]).then((result) => {
    clearTimeout(timeoutHandle);
    return result;
  });
};

/**
 * Проверяет не истекло ли время блокировки ССР в случае постоянных таймаутов
 * @param route
 */
function checkTimeDisabledSsr(route: string) {
  const info = counterSlowRenderMap.get(route);
  if (!info) {
    return;
  }

  if (info.endDisabledTimeSsr && info.endDisabledTimeSsr < +new Date()) {
    allSlowCounter = allSlowCounter - info.count;
    counterSlowRenderMap.delete(route);
  }
}

const nuxtPerformance: Module = function(moduleOptions) {
  const options = Object.assign({}, this.options.performance, moduleOptions);

  if (options.disabled) {
    console.log('[NuxtPerformance module] disabled.');
    return;
  }

  if (!this.nuxt.renderer) {
    return;
  }

  const defaultConfig: IConfig = {
    renderRouteTimeCallback: (_route: string, _ms: number) => {},
    isOnlySPA: (_route: string, _context: any) => { return false; },
    maxRenderTime: 2000,
    maxAttemptSsr: 5,
    excludeRoutes: /healthcheck/,
    timeDisabledSsrWithRoute: 1000 * 60,
    clearSlowCounterIntervalTime: 1000 * 60 * 5,
    maxSlowCount: 100
  };

  const config: IConfig = { ...defaultConfig, ...options };

  if (intervalCounter) {
    clearInterval(intervalCounter);
    intervalCounter = setInterval(() => {
      allSlowCounter = 0;
    }, config.clearSlowCounterIntervalTime);
  }

  const renderer = this.nuxt.renderer;
  const renderRoute = renderer.renderRoute.bind(renderer);

  renderer.renderRoute = async function (route: any, context: any) {
    if (config.excludeRoutes.test(route)) {
      return renderRoute(route, context);
    }

    if (config.isOnlySPA(route, context)) {
      context.spa = true;
      return renderRoute(route, context);
    }

    checkTimeDisabledSsr(route);

    const infoPrevRender = counterSlowRenderMap.get(route);

    let html = null;
    const start = +new Date();

    // блокируем всё ССР на всех страницах на время
    if (allSlowCounter > config.maxSlowCount) {
      context.spa = true;
    }

    try {
      if (infoPrevRender && infoPrevRender.count > config.maxAttemptSsr) {
        if (!infoPrevRender.endDisabledTimeSsr) {
          // блокируем ССР на указанное время, всегда СПА
          infoPrevRender.endDisabledTimeSsr = +new Date() + config.timeDisabledSsrWithRoute;
        }
        context.spa = true;
      }
      html = await promiseWithTimeout(route, config.maxRenderTime, renderRoute(route, context), '[NuxtPerformance module] timeout render');
    } catch (e) {
      context.spa = true;
      console.log(`[NuxtPerformance module] error in route: ${route}`, e);
      html = await renderRoute(route, context);
    }

    config.renderRouteTimeCallback(route, +new Date() - start);

    return html;
  };
};

export default nuxtPerformance;
