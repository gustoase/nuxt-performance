"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
exports.__esModule = true;
var counterSlowRenderMap = new Map();
// общее кол-во медленных запросов
var allSlowCounter = 0;
var intervalCounter = null;
/**
 * Отлупливает промис в заданное время по таймауту
 * @param route
 * @param timeoutMs
 * @param promise
 * @param failureMessage
 */
var promiseWithTimeout = function (route, timeoutMs, promise, failureMessage) {
    var timeoutHandle;
    var timeoutPromise = new Promise(function (_resolve, reject) {
        timeoutHandle = setTimeout(function () {
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
    ]).then(function (result) {
        clearTimeout(timeoutHandle);
        return result;
    });
};
/**
 * Проверяет не истекло ли время блокировки ССР в случае постоянных таймаутов
 * @param route
 */
function checkTimeDisabledSsr(route) {
    var info = counterSlowRenderMap.get(route);
    if (!info) {
        return;
    }
    if (info.endDisabledTimeSsr && info.endDisabledTimeSsr < +new Date()) {
        allSlowCounter = allSlowCounter - info.count;
        counterSlowRenderMap["delete"](route);
    }
}
var nuxtPerformance = function (moduleOptions) {
    var options = Object.assign({}, this.options.performance, moduleOptions);
    if (options.disabled) {
        console.log('[NuxtPerformance module] disabled.');
        return;
    }
    if (!this.nuxt.renderer) {
        return;
    }
    var defaultConfig = {
        renderRouteTimeCallback: function (_route, _ms) { },
        isOnlySPA: function (_route, _context) { return false; },
        maxRenderTime: 2000,
        maxAttemptSsr: 5,
        excludeRoutes: /healthcheck/,
        timeDisabledSsrWithRoute: 1000 * 60,
        clearSlowCounterIntervalTime: 1000 * 60 * 5,
        maxSlowCount: 100
    };
    var config = __assign(__assign({}, defaultConfig), options);
    if (intervalCounter) {
        clearInterval(intervalCounter);
        intervalCounter = setInterval(function () {
            allSlowCounter = 0;
        }, config.clearSlowCounterIntervalTime);
    }
    var renderer = this.nuxt.renderer;
    var renderRoute = renderer.renderRoute.bind(renderer);
    renderer.renderRoute = function (route, context) {
        return __awaiter(this, void 0, void 0, function () {
            var infoPrevRender, html, start, e_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (config.excludeRoutes.test(route)) {
                            return [2 /*return*/, renderRoute(route, context)];
                        }
                        if (config.isOnlySPA(route, context)) {
                            context.spa = true;
                            return [2 /*return*/, renderRoute(route, context)];
                        }
                        checkTimeDisabledSsr(route);
                        infoPrevRender = counterSlowRenderMap.get(route);
                        html = null;
                        start = +new Date();
                        // блокируем всё ССР на всех страницах на время
                        if (allSlowCounter > config.maxSlowCount) {
                            context.spa = true;
                        }
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 5]);
                        if (infoPrevRender && infoPrevRender.count > config.maxAttemptSsr) {
                            if (!infoPrevRender.endDisabledTimeSsr) {
                                // блокируем ССР на указанное время, всегда СПА
                                infoPrevRender.endDisabledTimeSsr = +new Date() + config.timeDisabledSsrWithRoute;
                            }
                            context.spa = true;
                        }
                        return [4 /*yield*/, promiseWithTimeout(route, config.maxRenderTime, renderRoute(route, context), '[NuxtPerformance module] timeout render')];
                    case 2:
                        html = _a.sent();
                        return [3 /*break*/, 5];
                    case 3:
                        e_1 = _a.sent();
                        context.spa = true;
                        console.log("[NuxtPerformance module] error in route: ".concat(route), e_1);
                        return [4 /*yield*/, renderRoute(route, context)];
                    case 4:
                        html = _a.sent();
                        return [3 /*break*/, 5];
                    case 5:
                        config.renderRouteTimeCallback(route, +new Date() - start);
                        return [2 /*return*/, html];
                }
            });
        });
    };
};
exports["default"] = nuxtPerformance;
//# sourceMappingURL=module.js.map