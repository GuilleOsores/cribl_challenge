import { Router } from '../router';
import * as file from '../handlers/file'

export default async function (router: Router) {
    router.get('/listFiles', file.list);
    router.get('/getFile', file.get);
    router.post('/uploadFile', file.upload);
}
