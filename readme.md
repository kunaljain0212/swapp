## Overview

SWAPP is an architecture designed to integrate strong security features inside a service worker's boundaries. This abstracted codebase focuses on enhancing SWAPP's compatibility and efficiency with modern JavaScript web frameworks such as React.js, Next.js, and Svelte.

## Features

- **Abstraction with Design System Fundamentals:** SWAPP has been abstracted using design system fundamentals to improve compatibility and efficiency across various modern web frameworks.
- **Improved Interoperability:** The abstraction process ensures seamless integration of SWAPP with popular web frameworks like React.js, Next.js, and Svelte, enhancing application security and performance.

- **Code Coverage and Optimization:** Rigorous testing has resulted in an impressive code coverage of 94.44%, ensuring the resilience of the codebase to future changes while optimizing bundle size for improved performance.

## Installation

To use this abstracted SWAPP codebase, follow these steps:

1. Clone the repository to your local machine.
2. Navigate to the project directory.
3. Install dependencies using `npm install` or `yarn install`.

## Usage

Refer to the documentation below and examples provided to integrate SWAPP into your web projects seamlessly. Customize the configuration as per your requirements to enhance application security and performance.

- Import the package in your app:

```js
import { useSWAPP } from 'swapp';
```

- Enable SWAPP protection by using any of the prevention methods:

```js
const { hashProtectedRouteId } = useSWAPP({ isDataGuardEnabled: false });
```

- Use the `hashProtectedRouteId` to protect your routes.
- On the protected route use the `isAuthorized` method to check if the route is authorized by passing the `id` of the route:

```js
let { id } = useParams();
const { isAuthorized } = useSWAPP({ id });
```

## Contributions

Contributions to this codebase are welcome! If you encounter any issues or have suggestions for improvements, please open an issue or submit a pull request.

## License

This codebase is licensed under the [MIT License](LICENSE.md).
