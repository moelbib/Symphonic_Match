#!/bin/bash

cd Kubernet_Zookeeper_Kafka/
chmod +x deploy_kafka.sh
./deploy_kafka.sh

cd ../serviceutilisateur/
chmod +x deploy_utilisateur.sh
./deploy_utilisateur.sh

cd ../serviceprofilmusical/
chmod +x deploy_profilmusical.sh
./deploy_profilmusical.sh


cd ../serviceevenements/
chmod +x deploy_evenement.sh
./deploy_evenement.sh