// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// ***************************************************************
// - [#] indicates a test step (e.g. # Go to a page)
// - [*] indicates an assertion (e.g. * Check the title)
// - Use element ID when selecting an element. Create one if none.
// ***************************************************************

// Stage: @prod
// Group: @channel
import * as TIMEOUTS from '../../fixtures/timeouts';

describe('Archived channels', () => {
    let testTeam;
    let otherUser;

    before(() => {
        cy.apiUpdateConfig({
            TeamSettings: {
                ExperimentalViewArchivedChannels: true,
            },
        });

        // # Login as test user and visit create channel
        cy.apiInitSetup().then(({team, channel}) => {
            testTeam = team;
            cy.visit(`/${testTeam.name}/channels/${channel.name}`);

            cy.apiCreateUser({prefix: 'second'}).then(({user: second}) => {
                cy.apiAddUserToTeam(testTeam.id, second.id);
                otherUser = second;
            });
        });
    });

    it('MM-T1716 Text box in center channel and in RHS should not be visible', () => {
        // * Post text box should be visible
        cy.get('#post_textbox').should('be.visible');

        // # Post a message in the channel
        cy.postMessage('Test archive reply');
        cy.clickPostCommentIcon();

        // * RHS should be visible
        cy.get('#rhsContainer').should('be.visible');

        // * RHS text box should be visible
        cy.get('#reply_textbox').should('be.visible');

        // # Archive the channel
        cy.uiArchiveChannel();

        // * Post text box should not be visible
        cy.get('#post_textbox').should('not.be.visible');

        // * RHS text box should not be visible
        cy.get('#reply_textbox').should('not.be.visible');
    });

    it('MM-T1722 Can click reply arrow on a post from archived channel, from saved posts list', () => {
        let testArchivedChannel;
        let postId;
        let permalink;

        cy.apiAdminLogin();

        // # Create a channel that will be archived
        cy.apiCreateChannel(testTeam.id, 'archived-channel', 'Archived Channel').then(({channel}) => {
            testArchivedChannel = channel;

            // # Visit the channel
            cy.visit(`/${testTeam.name}/channels/${testArchivedChannel.name}`);

            // # Post message
            cy.postMessage('Test');

            // # Create permalink to post
            cy.getLastPostId().then((id) => {
                postId = id;
                permalink = `${Cypress.config('baseUrl')}/${testTeam.name}/pl/${postId}`;

                // # Click on ... button of last post
                cy.clickPostDotMenu(postId);

                // # Click on "Copy Link"
                cy.uiClickCopyLink(permalink);

                // # Post the message in another channel
                cy.get('#sidebarItem_off-topic').click();
                cy.postMessage(`${permalink}`).wait(TIMEOUTS.ONE_SEC);
            });

            // # Archive the channel
            cy.visit(`/${testTeam.name}/channels/${testArchivedChannel.name}`);
            cy.uiArchiveChannel();
        });

        // # Change user
        cy.apiLogout();
        cy.reload();
        cy.apiLogin(otherUser);
        cy.visit(`/${testTeam.name}/channels/off-topic`);

        // # Read the message and save post
        cy.get('a.markdown__link').clickPostSaveIcon();

        // # View saved posts
        cy.get('#channelHeaderFlagButton').click();
        cy.wait(TIMEOUTS.HALF_SEC);

        // * RHS should be visible
        cy.get('#searchContainer').should('be.visible');

        // * Should be able to click on reply
        cy.clickPostCommentIcon();
        cy.postMessageReplyInRHS('replyyyy');

        // * RHS text box should be visible
        cy.get('#reply_textbox').should('be.visible');
    });
});
