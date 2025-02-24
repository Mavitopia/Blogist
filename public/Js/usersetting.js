document.querySelectorAll(".edit-btn").forEach(btn => {
    btn.addEventListener('click', function () {
        const answer = confirm("Are you sure?");
        if (answer) {
            window.location.href = 'http://localhost:3000/profile/setting/change';
        }
    });
});
document.querySelector(".logout--button").onclick = function () {
    const answer = confirm("Are you sure?");
    if (answer) {
        window.location.href = 'http://localhost:3000/profile/setting/logout';
    }
}
