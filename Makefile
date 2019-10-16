all:
	npm run dist

install:
	npm install
	./mkEnv.sh

run: all
	./run

