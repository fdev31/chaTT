.PHONY: dist

run: js
	@USER=MpZZ2bCdfJnABcNCjZjUZybuHAorQ4w5nU2xPFzFzTC1HXcR5YiJB5SvxuQGa3AGNlW6x PASS=YfjrZPZY65a5PQttAOoDSRWZB6CuTQt5Yo3hYNZ5PZzPQ63EtqRkudOvpKVpOq3AU3UA ./run.sh

clean:
	rm -fr static/js/*.*

js:
	npm run dev

dist:
	npm run dist

install:
	npm install
	./mkEnv.sh


