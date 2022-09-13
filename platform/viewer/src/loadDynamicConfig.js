export default async () => {
  let query = new URLSearchParams(window.location.search);
  let configUrl = query.get('configUrl');

  if (!configUrl) {
    // Handle OIDC redirects
    const obj = JSON.parse(sessionStorage.getItem('ohif-redirect-to'));
    if (obj) {
      const query = new URLSearchParams(obj.search);
      configUrl = query.get('configUrl');
    }
  } else {
    const response = await fetch(configUrl);
    return response.json();
  }

  return null;
};
