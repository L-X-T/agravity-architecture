# Micro Frontends with Webpack Module Federation and Angular

This lab shows how to use Webpack Module Federation together with the Angular CLI and the `@angular-architects/module-federation` plugin. The goal is to make a shell capable of **loading a separately compiled and deployed microfrontend**.

- [Micro Frontends with Webpack Module Federation and Angular](#micro-frontends-with-webpack-module-federation-and-angular)
  - [Activate and Configure Module Federation](#activate-and-configure-module-federation)
    - [Flight-App as shell and Passenger Micro Frontend](#flight-app-as-shell-and-passenger-micro-frontend)
    - [Activate and configure Module Federation](#activate-and-configure-module-federation)
  - [Try it out](#try-it-out)
  - [Bonus: Switch to Dynamic Federation \*](#bonus-switch-to-dynamic-federation-)
  - [Bonus: Share a Library of your Monorepo \*](#bonus-share-a-library-of-your-monorepo-)
  - [Module Federation and Web Components (Multiple Versions and Frameworks)](#module-federation-and-web-components-multiple-versions-and-frameworks)
    - [Inspect the Web-Component-based Micro Frontends](#inspect-the-web-component-based-micro-frontends)
  - [Bonus: More Details on Module Federation \*\*](#bonus-more-details-on-module-federation-)

## Activate and Configure Module Federation

### Flight-App as shell and Passenger Micro Frontend

In this part you will use the prepared workspace including the `passenger` app that is using Domain-driven Design (DDD) patterns with separated libraries.

1. Start the micro frontend `passenger` (`nx serve passenger -o`).
2. Search for passengers and navigate to the edit view.
3. Have a look to the micro frontend's source code including the used libraries.
4. Stop the CLI (`CTRL+C`).

### Activate and configure Module Federation

Now, let's activate and configure module federation for the shell (`flight-app`):

1. Install `@angular-architects/module-federation` into the passenger app:

   ```
   npm i @angular-architects/module-federation -D
   nx g @angular-architects/module-federation:init --project passenger --port 4201 --type remote
   ```

   This activates module federation, assigns a port for nx serve, and generates the skeleton of a module federation configuration.

2. In the project `passenger`, open the generated configuration file `apps/passenger/webpack.config.js`. Adjust it as follows:

   ```javascript
   const { shareAll, withModuleFederationPlugin } = require('@angular-architects/module-federation/webpack');

   module.exports = withModuleFederationPlugin({
     name: 'passenger',

     exposes: {
       // Adjust this line:
       './module': './apps/passenger/src/app/passenger/passenger.module.ts'
     },

     shared: {
       ...shareAll({ singleton: true, strictVersion: true, requiredVersion: 'auto' })
     }
   });
   ```

   This exposes the `PassengerModule` under the Name `./module`. Hence, the shell can use this path to load it.

3. Also, install `@angular-architects/module-federation` into the `flight-app`:

   ```
   nx g @angular-architects/module-federation:init --project flight-app --port 4200 --type host
   ```

4. In the `flight-app` project, open the file `apps/flight-app/webpack.config.js`. Adjust it as follows:

   ```javascript
   const { shareAll, withModuleFederationPlugin } = require('@angular-architects/module-federation/webpack');

   module.exports = withModuleFederationPlugin({
     remotes: {
       passenger: 'http://localhost:4201/remoteEntry.js'
     },

     shared: {
       ...shareAll({ singleton: true, strictVersion: true, requiredVersion: 'auto' })
     }
   });
   ```

   This references the separately compiled and deployed `passenger` project. There are some alternatives to configure its URL (see link at the end).

5. Open the `flight-app`'s router config (`apps/flight-app/src/app/app.routes.ts`) and add a route loading the micro frontend:

   ```javascript
   // Add this route:
   {
     path: 'mf-passenger',
     loadChildren: () => import('passenger/module').then(esm => esm.PassengerModule)
   },

   // This route ALWAYS needs to be the last one:
   {
     path: '**',
     redirectTo: 'home'
   }
   ```

   Please note that the imported URL consists of the names defined in the configuration files above. Also, for this URL, TypeScript will report an error, as this (virtual) URL does not correlates with a file. The **next step** will take care of this.

6. As the Url `passenger/module` does not exist at compile time, ease the TypeScript compiler by adding a typing. For this, create a file `apps/flight-app/src/mf.d.ts` with the following declaration:

   ```javascript
   declare module 'passenger/module' {
     export const PassengerModule: Type<unknown>;
   };
   ```

7. Now, you also need to create a menu item for the newly introduced route. For this, open you `flight-app`'s `sidebar.component.html` and add the following entry:

   ```html
   <li routerLinkActive="active">
     <a routerLink="mf-passenger">
       <i class="ti-user"></i>
       <p>MF Passenger</p>
     </a>
   </li>
   ```

## Try it out

Now, let's try it out!

1. Start the `flight-app` and `passenger` micro frontend side by side in two different windows:

   ```
   nx serve flight-app -o
   nx serve passenger -o
   ```

   **Hint:** You might use two terminals for this.

2. After a browser window with the shell opened (`http://localhost:4200`), click on the `MF Passenger` link in the sidebar. This should load the micro frontend into the `flight-app` shell.

3. Ensure yourself that the micro frontend runs in standalone mode at `http://localhost:4201` too.

Congratulations! You've implemented your first Module Federation project with Angular!

## Bonus: Switch to Dynamic Federation \*

Now, let's remove the need for registering the micro frontends upfront with shell.

1. Switch to your `flight-app` shell and open the file `webpack.config.js`. Here, remove the registered remotes:

   ```typescript
   remotes: {
     // Remove this line or comment it out:
     // 'passenger': "passenger@http://localhost:4201/remoteEntry.js",
   },
   ```

2. Open the file `app.routes.ts` and use the function `loadRemoteModule` instead of the dynamic `import()` statement:

   ```typescript
   // Add this import:
   import { loadRemoteModule } from '@angular-architects/module-federation';

   [...]
   const routes: Routes = [
     [...]
     // Update this route:
     {
       path: 'mf-passenger',
       loadChildren: () =>
         loadRemoteModule({
           type: 'module',
           remoteEntry: 'http://localhost:4201/remoteEntry.js',
           exposedModule: './module'
         })
         .then(esm => esm.PassengerModule)
       },
       [...]
       // This route ALWAYS needs to be the last one:
       {
         path: '**',
         redirectTo: 'home'
       }
   ]
   ```

3. Restart both, the `flight-app` shell and the `passenger` micro frontend.

4. The shell should still be able to load the micro frontend. However, now it's loaded dynamically.

This was quite easy, wasn't it? However, we can improve this solution a bit. Ideally, we load the remote entry upfront before Angular bootstraps. In this early phase, Module Federation tries to determine the highest compatible versions of all dependencies. Let's assume, the shell provides version `1.0.0` of a dependency (specifying `^1.0.0` in its `package.json`) and the micro frontend uses version `1.1.0` (specifying `^1.1.0` in its `package.json`). In this case, they would go with version `1.1.0`. However, this is only possible if the remote's entry is loaded upfront.

6. Switch to the `flight-app` project and open the file `main.ts`. Adjust it as follows:

   ```typescript
   import { loadRemoteEntry } from '@angular-architects/module-federation';

   Promise.all([loadRemoteEntry({ type: 'module', remoteEntry: 'http://localhost:4201/remoteEntry.js' })])
     .catch((err) => console.error('Error loading remote entries', err))
     .then(() => import('./bootstrap'))
     .catch((err) => console.error(err));
   ```

7. Restart both, the `flight-app` shell and the `passenger` micro frontend.

8. The shell should still be able to load the micro frontend.

## Bonus: Share a Library of your Monorepo \*

1. Add a library to your monorepo:

   ```
   nx g lib auth-lib --buildable --directory shared
   ```

2. As our monorepo uses linting rules to restrict the access between different types of libraries, we need to define some tags for our new library. For this, open the project's `project.json` in the monorepo's root and add the following tags to the entry for `shared-auth-lib`:

   ```json
   "tags": ["domain:shared", "type:util"]
   ```

3. As most IDEs only read global configuration files like the `tsconfig.base.json` once, restart your IDE (alternatively, your IDE might also provide an option for reloading these settings, e. g. by restarting the TypeScript Language Server).

4. Switch to your `auth-lib` project. In it's folder `auth-lib\src\lib`, create a file `auth-lib.service.ts` with the following service:

   ```typescript
   import { Injectable } from '@angular/core';

   @Injectable({
     providedIn: 'root'
   })
   export class AuthLibService {
     private userName: string | null = null;

     public get user(): string | null {
       return this.userName;
     }

     public login(userName: string, password: string): void {
       // Authentication for **honest** users
       this.userName = userName;
     }
   }
   ```

5. Switch to the `index.ts` of your `auth-lib` and make sure that the `AuthLibService` is exported:

   ```typescript
   export * from './lib/shared-auth-lib.module';
   // Add this:
   export { AuthLibService } from './lib/auth-lib.service';
   ```

6. Switch to your `flight-app` project and open its `app.component.ts`. Use the shared `AuthLibService` to login a user:

   ```typescript
   // Perhaps you need to add this manually:
   import { AuthLibService } from '@flight-workspace/shared/auth-lib';

   @Component({
     selector: 'app-flight-app',
     templateUrl: './app.component.html'
   })
   export class AppComponent {
     title = 'shell';

     constructor(private authService: AuthLibService) {
       this.authService.login('Alex', '');
     }
   }
   ```

7. Switch to your `passenger-feature-search` library and open its `search.component.ts`. Use the shared service to retrieve the current user's name:

   ```typescript
   export class SearchComponent {
       [...]

       user = this.authService.user;

       constructor(private authService: AuthLibService, [...]) {}

       [...]
   }
   ```

8. Open this component's template (`search.component.html`) and data bind the property `user`:

   ```html
   <div class="content">
     <div>User: {{ user }}</div>
     [...]
   </div>
   ```

9. Restart both, the `flight-app` and the micro frontend (`passenger`).

10. In the shell, navigate to the micro frontend. If it shows the same user name, the library is shared.

## Module Federation and Web Components (Multiple Versions and Frameworks)

In this section, we load web components via module federation. This allows us, to mix different frameworks and versions.

1. Install the tooling library `@angular-architects/module-federation-tools`:

   ```
   npm i @angular-architects/module-federation-tools --force
   ```

2. Restart your IDE

3. In your `flight-app`, open the file `app.routes.ts` and add the following routes pointing to existing web components:

   ```typescript
   [...]
   import { startsWith, WebComponentWrapper, WebComponentWrapperOptions } from '@angular-architects/module-federation-tools';

   export const APP_ROUTES: Routes = [
     [...]

     // Add this route:
     {
       path: 'angular2',
       component: WebComponentWrapper,
       data: {
         remoteEntry: 'https://gray-pond-030798810.azurestaticapps.net//remoteEntry.js',
         remoteName: 'angular2',
         exposedModule: './web-components',
         elementName: 'angular2-element'
       } as WebComponentWrapperOptions
     },

     // And this route too:
     {
       path: 'react',
       component: WebComponentWrapper,
       data: {
         remoteEntry: 'https://witty-wave-0a695f710.azurestaticapps.net/remoteEntry.js',
         remoteName: 'react',
         exposedModule: './web-components',
         elementName: 'react-element'
       } as WebComponentWrapperOptions
     },

     // And also this route:
     {
       matcher: startsWith('angular3'),
       component: WebComponentWrapper,
       data: {
         remoteEntry: 'https://gray-river-0b8c23a10.azurestaticapps.net/remoteEntry.js',
         remoteName: 'angular3',
         exposedModule: './web-components',
         elementName: 'angular3-element'
       } as WebComponentWrapperOptions
     },

     // This route ALWAYS needs to be the last one:
     {
       path: '**',
       redirectTo: 'home'
     }
   ];
   ```

   As the Angular Router does not allow directly routing to web components, here we use a wrapper component `WebComponentWrapper`.

4. Switch to your `flight-app`'s `sidebar.component.html` and add menu items for your new routes:

   ```html
   <li routerLinkActive="active">
     <a routerLink="react">
       <i class="ti-user"></i>
       <p>MF React</p>
     </a>
   </li>

   <li routerLinkActive="active">
     <a routerLink="angular2">
       <i class="ti-user"></i>
       <p>MF Angular #2</p>
     </a>
   </li>

   <li routerLinkActive="active">
     <a routerLink="angular3/a">
       <i class="ti-user"></i>
       <p>MF Angular #3</p>
     </a>
   </li>
   ```

5. Now, let's make sure that sharing packages and zone.js with web components works seamlessly. Switch to your `flight-app`'s `bootstrap.ts` and adjust it as follows:

   ```typescript
   import { bootstrap } from '@angular-architects/module-federation-tools';
   import { AppModule } from './app/app.module';
   import { environment } from './environments/environment';

   bootstrap(AppModule, {
     production: environment.production,
     appType: 'shell'
   });
   ```

   **Remarks:** This new `boostrap` method makes sure we can bootstrap several separately compiled applications in the same browser tab.

6. Start your application and assure yourself that the web components are loaded. You should also see some other details:

   - MF Angular #2 and #3 should share the same Angular instance. If they share the Angular version with the shell, no additional bundle set with Angular are loaded. Otherwise, only one additional bundle set is loaded and shared across them. You can inspect this using your browser's debug tools (network tab). This is because we combine Web Components with Module Federation.

   - MF Angular #3 uses routing and introduces sub routes

### Inspect the Web-Component-based Micro Frontends

In this part of the lab, we will investigate the loaded micro frontend that has been called ["MF Angular #3"](https://github.com/manfredsteyer/angular3-app) before. We want to draw your attention to the following details:

1. The application is bootstrapped with the [bootstrap function](https://github.com/manfredsteyer/angular3-app/blob/main/src/bootstrap.ts) already used above.

2. The `AppModule` is wrapping some components as web components using Angular Elements in it's [ngDoBootstrap](https://github.com/manfredsteyer/angular3-app/blob/main/src/app/app.module.ts) method.

3. The [webpack config](https://github.com/manfredsteyer/angular3-app/blob/main/webpack.config.js) exposes the whole `bootstrap.ts` file. Hence, everyone importing it can use the provided web components.

4. The [webpack config](https://github.com/manfredsteyer/angular3-app/blob/main/webpack.config.js) shares libraries like `@angular/core`.

## Bonus: More Details on Module Federation \*\*

If you would like to know more about Module Federation with Angular take a look at this [article series about Module Federation](https://www.angulararchitects.io/aktuelles/the-microfrontend-revolution-part-2-module-federation-with-angular/).
