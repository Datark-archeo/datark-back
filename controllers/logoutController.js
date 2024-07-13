const User = require('../models/user.model');
/**
 * @swagger
 * components:
 *   responses:
 *     NoContent:
 *       description: No content
 *     InternalServerError:
 *       description: Internal server error
 */

/**
 * @swagger
 * /logout:
 *   post:
 *     summary: Logout the user
 *     tags: [Logout]
 *     responses:
 *       204:
 *         $ref: '#/components/responses/NoContent'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
const handleLogout = async (req, res) => {
    const cookies = req.cookies;
    if (!cookies?.jwt) return res.sendStatus(204); // No content
    const refreshToken = cookies.jwt;

    try {
        // Is refreshToken in db?
        const foundUser = await User.findOne({ refreshToken: refreshToken }).exec();
        if (!foundUser) {
            res.clearCookie('jwt', { httpOnly: true, secure: true });
            return res.sendStatus(204); // No content
        }

        // Delete refreshToken in db
        foundUser.refreshToken = foundUser.refreshToken.filter(rt => rt !== refreshToken);

        try {
            await foundUser.save();
            res.clearCookie('jwt', { httpOnly: true, secure: true });
            res.sendStatus(204); // No content
        } catch (error) {
            if (error instanceof mongoose.Error.VersionError) {
                // Handle VersionError
                res.status(409).send({ message: 'Document has been modified, please try again' });
            } else {
                // Handle other errors
                res.status(500).send({ message: 'Internal server error' });
            }
        }
    } catch (error) {
        res.status(500).send({ message: 'Internal server error' });
    }
}

module.exports = { handleLogout };
