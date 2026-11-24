# ParkEasy

*Stop searching, start parking.*

ParkEasy helps drivers find parking through real-time reports from other drivers. When someone is about to leave a parking space, they can share its location so nearby drivers know where to look next.

[Try the live prototype](https://parkeasywithus.lovable.app)

## Why we built it

Finding parking on a busy street often means circling the same blocks without knowing where a space might open up. Meanwhile, the driver who is about to leave already has information that could help someone nearby. ParkEasy gives that driver a quick way to share it.

## How it works

- *Leaving a space?* Tap *I’m Leaving* to create a temporary parking report using your current location.
- *Looking for parking?* Browse recent reports on the map, select a spot, and open directions in a navigation app.
- *Found an outdated report?* Community feedback helps keep the map useful as parking availability changes.

A report is a lead on a parking space. Availability can change before you arrive.

## The web prototype

The current prototype includes an interactive map, GPS-based reporting, nearby results, navigation links, and user accounts. Parking reports expire, and drivers earn community points for contributing.

The interface supports mobile browsers. We’re using the prototype to inform the design of the Flutter app planned for our course.

## What we’re exploring next

- *Report validation:* Use location checks to improve confidence in reports.
- *Location-based search:* Find relevant reports around a selected destination.
- *Simultaneous updates:* Handle cases where several drivers update the same report at once.
- *Community incentives:* Explore reliability ratings, achievements, and ParkCoins.

## Tech stack

- *Frontend:* React, TypeScript, Vite, Tailwind CSS, and shadcn/ui
- *Backend and data:* Supabase and PostgreSQL
- *Mobile tooling:* Capacitor

## Project team

ParkEasy is an academic project by *Lozan Amer* and *Ghazal Abu Shibly* at Kinneret Academic College.
