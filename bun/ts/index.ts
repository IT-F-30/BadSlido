interface Todo {
    word: string;
    weight: number;
}

let todos: Todo[] = [];

function initWordCloud() {
    $("#wordCloud").jQWCloud({
        words: todos,
        minFont: 10,
        maxFont: 100,
        fontOffset: 5,
        cloud_font_family: 'montserrat',
        verticalEnabled: true,
        padding_left: 1,
        showSpaceDIV: false,
        spaceDIVColor: 'white',
        word_common_classes: 'WordClass',
        beforeCloudRender: function () {
            const date1 = new Date();
        }
    });
}

async function fetchAndDisplayTodos() {
    try {
        const response = await fetch('/api/todos');
        todos = await response.json();
        initWordCloud();
    } catch (error) {
        console.error('データ取得エラー:', error);
    }
}

$(document).ready(function () {
    fetchAndDisplayTodos();
});

async function addTodo(word: string, weight: number) {
    try {
        const response = await fetch('/api/todos', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                word,
                weight,
            }),
        });

        const newTodo = await response.json();

        // データを再取得して表示
        await fetchAndDisplayTodos();

        return newTodo;
    } catch (error) {
        console.error('Todo追加エラー:', error);
        throw error;
    }
}