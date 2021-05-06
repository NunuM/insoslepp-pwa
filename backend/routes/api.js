const express = require('express');
const router = express.Router();

const configs = require('../configs.json');
const controller = require('../src/controller');
const {
    HttpError,
    Sitemap,
    DtoToDomain,
    ErrorParser,
    AppMiddlewares
} = require('../src/utils');

router.get('/categories',
    (req, res) => {
        controller.getCategories()
            .then((result) => {
                res.json(result);
            }).catch((error) => {
            ErrorParser.parse(error, req, res);
        })
    });

router.get('/wall/suggestion',
    (req, res) => {
        controller
            .getSearchSuggestions(req.query['q'], req.query['cat'], req.query['page'])
            .then((results) => {
                res.json(results);
            })
            .catch((error) => {
                ErrorParser.parse(error, req, res);
            });
    });

router.get('/wall',
    AppMiddlewares.userMiddleware,
    (req, res) => {
        controller
            .getWall(req.userId, req.query['q'], Number(req.query['cat']), req.query['order'], Number(req.query['page']))
            .then((wall) => res.json(wall))
            .catch((error) => {
                ErrorParser.parse(error, req, res);
            });
    });

router.get('/posts/:id',
    AppMiddlewares.userMiddleware,
    (req, res) => {
        controller
            .getPostById(req.userId, Number(req.params.id))
            .then((r) => res.json(r))
            .catch((error) => {
                ErrorParser.parse(error, req, res);
            });
    });

router.post('/posts/:id/liked',
    AppMiddlewares.userMiddleware,
    (req, res) => {
        controller
            .updatePostLikes(req.userId, Number(req.params.id), req.body['liked'])
            .then(() => {
                res.end();
            }).catch((error) => {
            console.error(error);
            ErrorParser.parse(error, req, res);
        });
    });

router.post('/posts/:id/seen',
    AppMiddlewares.userMiddleware,
    (req, res) => {
        controller
            .markPostAsSeen(req.userId, Number(req.params.id))
            .then(() => {
                res.end();
            }).catch((error) => {
            ErrorParser.parse(error, req, res);
        });

    });

router.post('/posts/:id/live',
    AppMiddlewares.userMiddleware,
    (req, res) => {
        controller
            .updatePostLiveListening(req.userId, Number(req.params.id), req.body['play'])
            .then(() => {
                res.end();
            }).catch((error) => {
            ErrorParser.parse(error, req, res);
        });
    });

router.post('/users',
    (req, res) => {
        controller.registerUser(req.body)
            .then((insertedId) => {
                return controller.tokenForUserId(insertedId);
            })
            .then((token) => {
                res.json(token);
            })
            .catch((error) => {
                ErrorParser.parse(error, req, res);
            });
    });

router.put('/users',
    AppMiddlewares.userMiddleware, (req, res) => {
        controller
            .updatePubSubSubscription(req.userId, req.body['sub'])
            .then(() => {
                res.end();
            }).catch((error) => {
            console.log('Error updating push settings', req.body, error);
            if (error instanceof HttpError) {
                error.response(res);
            } else {
                res.status(503).end();
            }
        });
    });


router.get('/info/:id', async (req, res) => {
    controller
        .getAudioUrlForPost(req, res, req.userId, Number(req.params.id))
        .catch((error) => {
            ErrorParser.parse(error, req, res);
        });
});

router.post('/info/:id', async (req, res) => {
        controller
            .getAudioUrlForPost(req, res, req.userId, Number(req.params.id))
            .catch((error) => {
                ErrorParser.parse(error, req, res);
            });
    });

router.get('/sitemap', (_, res) => {
    Sitemap.siteMap(res).catch((error) => {
        console.log('Error generating sitemap', error);
    });
});


router.post('/push/:post',
    AppMiddlewares.adminMiddleware,
    async (req, res) => {
        try {
            await controller.sendPushNotifications(req.params.post, Number(req.query['userId']));
            res.end();
        } catch (error) {
            ErrorParser.parse(error, req, res);
        }
    });

router.post('/bugs',
    AppMiddlewares.userMiddleware,
    (req, res) => {
        controller.insertBugReport(req.userId, req.body['message'])
            .then(() => {
                res.end();
            }).catch((error) => {
            ErrorParser.parse(error, req, res)
        });
    });

module.exports = router;
