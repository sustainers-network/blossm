// How many request times a count keeps. The issue command's highest limit, the
// one on an email whoever asks, must not be more than this.
const KEPT_REQUESTS = 20;

export default {
  // A count of challenge requests. Its aggregate is keyed by the email, or by
  // the email and the caller's address, not by a challenge.
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
