import voicescript_map
import unittest


class MainTestCase(unittest.TestCase):

    # check whether all mapping are loaded
    def test_loadMapping(self):
        voicescript_map.loadMapping()
        self.assertEqual(len(voicescript_map.voiceMap), 20)



if __name__ == '__main__':
    unittest.main()