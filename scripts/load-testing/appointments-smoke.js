import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: Number(__ENV.VUS || 5),
  duration: __ENV.DURATION || '1m',
  thresholds: {
    http_req_duration: ['p(95)<500'],
    http_req_failed: ['rate<0.01'],
  },
};

export default function () {
  const baseUrl = __ENV.BASE_URL || 'http://localhost:3001';

  const health = http.get(`${baseUrl}/health`);
  check(health, {
    'health endpoint is 200': (r) => r.status === 200,
  });

  if (__ENV.APPOINTMENTS_ENDPOINT) {
    const appointments = http.get(`${baseUrl}${__ENV.APPOINTMENTS_ENDPOINT}`);
    check(appointments, {
      'appointments endpoint is 200': (r) => r.status === 200,
    });
  }

  sleep(1);
}

