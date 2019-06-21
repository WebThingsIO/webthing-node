# webthing Changelog

## [Unreleased]
### Changed
- Things now use `title` rather than `name`.
- Things now require a unique ID in the form of a URI.
### Added
- Support for `id`, `base`, `security`, and `securityDefinitions` keys in thing description.

## [0.11.1] - 2019-06-05
### Added
- Ability to set a base URL path on server.

## [0.11.0] - 2019-01-16
### Changed
- WebThingServer constructor can now take a list of additional API routes.
### Fixed
- Properties could not include a custom `links` array at initialization.

## [0.10.0] - 2018-11-30
### Changed
- Property, Action, and Event description now use `links` rather than `href`. - [Spec PR](https://github.com/mozilla-iot/wot/pull/119)

[Unreleased]: https://github.com/mozilla-iot/webthing-node/compare/v0.11.1...HEAD
[0.11.1]: https://github.com/mozilla-iot/webthing-node/compare/v0.11.0...v0.11.1
[0.11.0]: https://github.com/mozilla-iot/webthing-node/compare/v0.10.0...v0.11.0
[0.10.0]: https://github.com/mozilla-iot/webthing-node/compare/v0.9.1...v0.10.0
