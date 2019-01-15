# webthing Changelog

## [Unreleased]
### Changed
- WebThingServer constructor can now take a list of additional API routes.
### Fixed
- Properties could not include a custom `links` array at initialization.

## [0.10.0] - 2018-11-30
### Changed
- Property, Action, and Event description now use `links` rather than `href`. - [Spec PR](https://github.com/mozilla-iot/wot/pull/119)

[Unreleased]: https://github.com/mozilla-iot/webthing-node/compare/v0.10.0...HEAD
[0.10.0]: https://github.com/mozilla-iot/webthing-node/compare/v0.9.1...v0.10.0
