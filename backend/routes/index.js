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

let categories

controller.getCategories().then((cats) => {
    categories = cats;
});

router.options('*', (req, res) => {
    res.end();
});

router.get('/admin/posts',
    AppMiddlewares.adminUiMiddleware,
    (req, res) => {
    controller
        .getWall(req.userId, req.query['q'], Number(req.query['cat']), req.query['order'], Number(req.query['page']))
        .then((wall) => {
            res.render('home', {
                url: configs.domain + req.path,
                image: configs.domain + '/assets/cover.png',
                appName: configs.appName,
                navigation: categories,
                wall,
                page: Number(req.query['page'] || 0),
                PAGE_SIZE: configs.resultsPageSize,
                domain: configs.domain,
                title: configs.appName,
                description: configs.description
            });
        })
        .catch((error) => {
            ErrorParser.parse(error, req, res);
        });
});

router.get('/admin/posts/:id',
    AppMiddlewares.adminUiMiddleware,
    (req, res) => {
    controller.getPostById(null, Number(req.params.id))
        .then((post) => {
            if (post.images) {
                post.images = JSON.parse(post.images);
            }
            if (post.tips) {
                post.tips = JSON.parse(post.tips);
            }
            res.render('post', Object.assign(post, {
                url: configs.domain + req.path,
                image: configs.domain + '/api/' + req.path + '/image',
                appName: configs.appName,
                navigation: categories,
                domain: configs.domain
            }));
        })
        .catch((error) => {
            ErrorParser.parse(error, req, res);
        });
});

router.get('/admin/posts/:id/edit',
    AppMiddlewares.adminUiMiddleware,
    (req, res) => {
    controller.getPostById(null, Number(req.params.id))
        .then((post) => {
            if (post.images) {
                post.images = JSON.parse(post.images);
            }
            if (post.tips) {
                post.tips = JSON.parse(post.tips);
            }
            res.render('edit-post', Object.assign(post, {
                url: configs.domain + req.path,
                image: configs.domain + '/api/' + req.path + '/image',
                appName: configs.appName,
                navigation: categories,
                domain: configs.domain,
                categories
            }));
        })
        .catch((error) => {
            ErrorParser.parse(error, req, res);
        });
});

router.post('/admin/posts/:id/edit',
    AppMiddlewares.adminUiMiddleware,
    (req, res) => {
    controller.updatePost(Number(req.params.id), req.body)
        .then(() => {
            res.redirect('/admin/posts/' + req.params.id);
        })
        .catch((error) => {
            res.write('Update Error' + error.message);
            res.end();
            console.log('Error updating', error);
        });
})


module.exports = router;
