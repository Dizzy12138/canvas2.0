# Code Review Notes for AppRunner SSE Lifecycle Update

## Summary
The recent changes to `frontend/src/components/AppRunner.jsx` introduce an explicit `EventSource` lifecycle when running apps. While the overall structure looks good, there is a cleanup bug that keeps finished SSE connections alive if the component unmounts or if `appId` changes after a run.

## Findings
1. **Stale cleanup reference for `EventSource`**  
   The cleanup callback registered in `useEffect` only executes when `appId` changes or the component unmounts. However, it closes the `EventSource` instance captured at the time the effect ran. Because `sseConnection` is *not* part of the dependency array, React freezes its value to whatever it was when the effect first executed (initially `null`). Consequently, any connection created later stays open during unmount/app switches, producing dangling network requests.  
   *Suggested fix:* include `sseConnection` in the dependency list (or hold the connection in a `useRef`) so the cleanup sees the latest handle before closing it.

## Recommendation
Block the change until the cleanup issue is addressed.
