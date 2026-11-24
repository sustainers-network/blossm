// How many request times an email's count keeps. More than the issue command's
// limit, which only looks at the recent ones.
const KEPT_REQUESTS = 20;

export default {
  // An email's count of challenge requests. Its aggregate is keyed by the
  // email, not by a challenge.
  request: (state, payload) => {
    return {
      ...state,
      requests: [...(state.requests || []), payload.requested].slice(
        -KEPT_REQUESTS
      ),
    };
  },
  issue: (state, payload) => {
    return {
      ...state,
      ...payload,
    };
  },
  answer: (state, payload) => {
    return {
      ...state,
      ...payload,
    };
  },
  fail: (state) => {
    return {
      ...state,
      attempts: (state.attempts || 0) + 1,
    };
  },
};
