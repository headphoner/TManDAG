# What is tman_dag?
tman_dag is a task management app for iOS which represents tasks in a direct acyclic grapah (DAG).

# Documentation
To build the source code documentation, run `npx typedox` while in the base project folder.
This will compile all of the JSDoc style comments in the source code into a HTML document accessible at `./docs/index.html`.

# Build (iOS)
Note that in order to build for iOS, an applicable Apple product must be used (e.g. a MacBook or iMac)
For running the app on a local machine:

- Install the required libraries: run `npm install` in the base project directory
- Build and start a local test  `npm run ios`. After the command completes, an iOS simulator should open with the app installed

For deploying the app to an iPhone or iPad, do the steps above then follow the [official Apple deployment tutorial](https://developer.apple.com/documentation/xcode/preparing-your-app-for-distribution).

# Roadmap
Features which are planned to be developed (at some point in the future)
- Android build
- Better task management UI (allow easy editing of parent-child relationships, scrolling, better task placement on screen, drag-drop functionality)
- Secondary schedule view (itemized list of schedule events rather than timespan showing them)
- Calendar integration
