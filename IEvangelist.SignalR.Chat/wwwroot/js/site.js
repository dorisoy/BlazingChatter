﻿(function () {
    const connection =
        new signalR.HubConnectionBuilder()
            .withUrl('/chat')
            .build();

    const app = new Vue({
        el: '#chat',
        data: {
            messageId: null,
            message: '',
            messages: new Map(),
            typingUsers: []
        },
        watch: {
            message: function(newMsg, oldMsg) {
                this.typing(!!newMsg);
            }
        },
        computed: {
            usersTyping: function() {
                const length = this.typingUsers.length;
                if (length) {
                    switch (length) {
                    case 1:
                        return `${this.typingUsers[0]} is typing...`;
                    case 2:
                        return `${this.typingUsers[0]} and ${this.typingUsers[1]} are typing...`;
                    default:
                        return 'Multiple people are typing...';
                    }
                }
                return ' ';
            }
        },
        methods: {
            postMessage() {
                if (this.message) {
                    connection.invoke('postMessage', this.message, this.messageId);
                    this.message = this.messageId = '';
                }
            },
            typing(isTyping) {
                connection.invoke('userTyping', isTyping);
            },
            toArray(messages) {
                return Array.from(messages);
            },
            noLongerTyping: _.debounce(function() {
                 this.typing(false);
            }, 500),
            nudge() {
                this.$forceUpdate();
            }
        }
    });

    const updateScroll = () => {
        const element = document.querySelector('html');
        element.scrollTop = element.scrollHeight;
    };

    connection.on('messageReceived',
        json => {
            app.messages.set(json.id, json);
            app.nudge();
            updateScroll();
            setTimeout(updateScroll);
        });

    connection.on('userTyping',
        json => {
            const index = app.typingUsers.indexOf(json.user);
            if (index === -1) {
                app.typingUsers.push(json.user);
            } else if (!json.isTyping) {
                app.typingUsers.splice(index, 1);
            }
        });

    // Reconnect loop
    const start = () => {
        connection.start().catch(_ => {
            setTimeout(() => start(), 5000);
        });
    };

    connection.onclose(() => start());

    start();
})();